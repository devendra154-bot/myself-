// One live phone call: phone audio in -> speech-to-text -> Claude -> text-to-speech -> phone audio out.
import { config, LANGUAGES } from "./config.js";
import { VoiceDetector } from "./audio.js";
import { transcribe, speak } from "./speech.js";
import { Conversation } from "./agent.js";
import { calls } from "./store.js";
import { sendWhatsApp } from "./actions.js";
import { localNow } from "./time.js";
import { addClaudeUsage, emptyUsage } from "./billing.js";

const MAX_CALL_MS = 10 * 60 * 1000;
const SILENCE_NUDGE_MS = 9000;

export class CallSession {
  constructor({ call, agent, provider, ws, streamId, onEnd }) {
    Object.assign(this, { call, agent, provider, ws, streamId, onEnd });
    this.pending = [];
    this.busy = false;
    this.ended = false;
    this.interrupted = false;
    this.generation = 0; // bumps on barge-in so stale audio is dropped
    this.speechChain = Promise.resolve();
    this.playbackEndsAt = 0;
    this.lastActivity = Date.now();
    this.nudges = 0;
    this.endAfterSpeech = null;
    this.sttLang = LANGUAGES[agent.language]?.stt;
    call.usage ||= emptyUsage();

    this.vad = new VoiceDetector({
      threshold: config.vad.threshold,
      endSilenceMs: config.vad.endSilenceMs,
      onSpeechStart: () => { this.lastActivity = Date.now(); },
      onUtterance: (pcm) => this.onUtterance(pcm),
    });

    this.convo = new Conversation(agent, {
      onSentence: (s) => this.say(s),
      runTool: (name, input) => this.runTool(name, input),
      onUsage: (model, usage) => addClaudeUsage(this.call, model, usage),
    });
  }

  log(role, text) {
    const entry = { role, text, at: new Date().toISOString() };
    this.call.transcript.push(entry);
    calls.update(this.call.id, {});
  }

  async start() {
    calls.update(this.call.id, { status: "in-progress", answeredAt: new Date().toISOString() });
    this.timer = setInterval(() => this.watchdog(), 1000);
    const who = this.call.name ? ` The person's name is ${this.call.name}.` : "";
    const vars = Object.keys(this.call.vars || {}).length ? ` Lead details: ${JSON.stringify(this.call.vars)}.` : "";
    const kickoff = this.call.direction === "inbound"
      ? `[Incoming call answered. It is ${localNow()}. Caller number ${this.call.phone}. Greet them as ${this.agent.business} and ask how you can help.]`
      : `[Call connected, they just picked up. It is ${localNow()}.${who}${vars} Start with your opening: ${this.agent.openingLine || "greet them and say why you are calling"}]`;
    this.pending.push(kickoff);
    this.process();
  }

  // ---------- audio in ----------
  onMedia(mulaw) {
    if (this.ended) return;
    this.vad.push(mulaw);
    // Barge-in: the caller talks over the agent -> stop speaking immediately.
    if (this.isSpeaking() && this.vad.continuousSpeechMs >= config.vad.bargeInMs) this.interrupt();
  }

  async onUtterance(pcm) {
    if (this.ended) return;
    this.lastActivity = Date.now();
    let text = "";
    try {
      this.call.usage.sttSeconds += pcm.length / 16000; // PCM16 at 8 kHz
      text = await transcribe(pcm, this.sttLang);
    } catch (err) {
      console.error(`[${this.call.id}] STT failed:`, err.message);
      return;
    }
    if (!text || this.ended) return;
    this.log("caller", text);
    this.nudges = 0;
    this.pending.push(text);
    this.process();
  }

  async process() {
    if (this.busy || this.ended) return;
    this.busy = true;
    try {
      while (this.pending.length && !this.ended) {
        let text = this.pending.splice(0).join(" ");
        if (this.interrupted) {
          text = `[The caller interrupted you, so they did not hear the end of what you said.] ${text}`;
          this.interrupted = false;
        }
        await this.convo.turn(text);
      }
    } catch (err) {
      console.error(`[${this.call.id}] conversation error:`, err);
      this.say(["hi", "mr"].includes(this.agent.language) ? "माफ़ कीजिए, अभी दिक्कत आ रही है। हमारी टीम आपको वापस कॉल करेगी।" : "Sorry, I am having trouble right now. Our team will call you back.");
      this.endAfterSpeech = "error";
    } finally {
      this.busy = false;
    }
    if (this.endAfterSpeech && !this.ended) this.hangupAfterSpeech(this.endAfterSpeech);
  }

  // ---------- audio out ----------
  isSpeaking() {
    return Date.now() < this.playbackEndsAt;
  }

  say(sentence) {
    const gen = this.generation;
    this.log("agent", sentence);
    this.speechChain = this.speechChain.then(async () => {
      if (gen !== this.generation || this.ended) return;
      this.abort = new AbortController();
      try {
        this.call.usage.ttsChars += sentence.length;
        await speak(sentence, {
          voiceId: this.agent.voiceId,
          languageCode: this.agent.language,
          signal: this.abort.signal,
          onAudio: (chunk) => {
            if (gen !== this.generation || this.ended || this.ws.readyState !== 1) return;
            this.provider.sendAudio(this.ws, this.streamId, chunk);
            this.playbackEndsAt = Math.max(this.playbackEndsAt, Date.now()) + chunk.length / 8;
            this.lastActivity = Date.now();
          },
        });
      } catch (err) {
        if (err.name !== "AbortError") console.error(`[${this.call.id}] TTS failed:`, err.message);
      }
    });
  }

  interrupt() {
    this.generation++;
    this.interrupted = true;
    this.abort?.abort();
    this.playbackEndsAt = 0;
    this.speechChain = Promise.resolve();
    try { this.provider.clearAudio(this.ws, this.streamId); } catch {}
  }

  async waitForSpeech() {
    await this.speechChain;
    const left = this.playbackEndsAt - Date.now();
    if (left > 0) await new Promise((r) => setTimeout(r, left + 300));
  }

  // ---------- tools ----------
  async runTool(name, input) {
    const c = this.call;
    switch (name) {
      case "save_details":
        for (const d of input.details) c.fields[d.field] = d.value;
        calls.update(c.id, {});
        return "saved";
      case "book_appointment":
        c.booking = { when: input.when, what: input.what, notes: input.notes || "" };
        calls.update(c.id, {});
        return `Booked: ${input.what} at ${input.when}`;
      case "schedule_callback":
        c.callbackAt = input.when;
        calls.update(c.id, {});
        return `Callback scheduled for ${input.when}`;
      case "send_whatsapp": {
        const r = await sendWhatsApp(c.phone, input.message, this.agent);
        (c.actions ||= []).push({ type: "whatsapp", message: input.message, at: new Date().toISOString() });
        calls.update(c.id, {});
        return r;
      }
      case "transfer_call":
        (c.actions ||= []).push({ type: "transfer", reason: input.reason, at: new Date().toISOString() });
        calls.update(c.id, { transferred: true });
        this.waitForSpeech().then(() => this.provider.transfer(c.providerCallId, this.agent.transferNumber))
          .catch((err) => console.error(`[${c.id}] transfer failed:`, err.message));
        return "Transferring now";
      case "end_call":
        calls.update(c.id, { endReason: input.reason, doNotCall: !!input.do_not_call });
        this.endAfterSpeech = input.reason;
        return "The call will end after your goodbye is spoken";
      default:
        throw new Error(`Unknown tool ${name}`);
    }
  }

  // ---------- lifecycle ----------
  watchdog() {
    if (this.ended) return;
    const started = new Date(this.call.answeredAt).getTime();
    if (Date.now() - started > MAX_CALL_MS) return this.hangupAfterSpeech("max duration");
    if (this.busy || this.isSpeaking() || this.vad.inSpeech || this.endAfterSpeech) return;
    if (Date.now() - this.lastActivity > SILENCE_NUDGE_MS) {
      this.lastActivity = Date.now();
      if (++this.nudges > 2) return this.hangupAfterSpeech("no response");
      this.pending.push("[The caller has been silent for a while. Check if they can hear you, briefly.]");
      this.process();
    }
  }

  async hangupAfterSpeech(reason) {
    if (this.hangingUp) return;
    this.hangingUp = true;
    await this.waitForSpeech();
    calls.update(this.call.id, { endReason: this.call.endReason || reason });
    if (!this.call.transferred) {
      try { await this.provider.hangup(this.call.providerCallId); } catch (err) { console.error(`[${this.call.id}] hangup failed:`, err.message); }
    }
    this.stop();
  }

  /** The media stream closed (caller hung up, we hung up, or transfer). */
  stop() {
    if (this.ended) return;
    this.ended = true;
    clearInterval(this.timer);
    this.abort?.abort();
    calls.update(this.call.id, { status: "completed", endedAt: new Date().toISOString() });
    this.onEnd?.(this.call);
  }
}
