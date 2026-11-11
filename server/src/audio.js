// Phone audio helpers: 8 kHz G.711 mu-law <-> 16-bit PCM, WAV wrapping and a
// simple energy-based voice activity detector (VAD).

const MULAW_DECODE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  const u = ~i & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample -= 0x84;
  MULAW_DECODE[i] = sign ? -sample : sample;
}

/** Decode a mu-law Buffer to a PCM16 little-endian Buffer. */
export function mulawToPcm16(mulaw) {
  const out = Buffer.alloc(mulaw.length * 2);
  for (let i = 0; i < mulaw.length; i++) out.writeInt16LE(MULAW_DECODE[mulaw[i]], i * 2);
  return out;
}

export function rms(pcm16) {
  const n = pcm16.length / 2;
  if (!n) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = pcm16.readInt16LE(i * 2);
    sum += s * s;
  }
  return Math.sqrt(sum / n);
}

/** Wrap PCM16 mono audio in a WAV header. */
export function pcm16ToWav(pcm16, sampleRate = 8000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm16.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm16.length, 40);
  return Buffer.concat([h, pcm16]);
}

/**
 * Turns a stream of 20 ms mu-law frames into utterances.
 * Emits: onSpeechStart(), onUtterance(pcm16Buffer).
 * The threshold adapts to line noise so quiet and noisy lines both work.
 */
export class VoiceDetector {
  constructor({ threshold = 600, endSilenceMs = 700, maxUtteranceMs = 15000, onSpeechStart, onUtterance }) {
    this.baseThreshold = threshold;
    this.noiseFloor = 150;
    this.endSilenceMs = endSilenceMs;
    this.maxUtteranceMs = maxUtteranceMs;
    this.onSpeechStart = onSpeechStart;
    this.onUtterance = onUtterance;
    this.reset();
  }

  reset() {
    this.inSpeech = false;
    this.speechMs = 0;
    this.silenceMs = 0;
    this.chunks = [];
    this.preroll = [];
    this.continuousSpeechMs = 0;
  }

  get threshold() {
    return Math.max(this.baseThreshold, this.noiseFloor * 3);
  }

  /** @param {Buffer} mulaw any length; duration = length / 8 ms */
  push(mulaw) {
    const pcm = mulawToPcm16(mulaw);
    const ms = mulaw.length / 8;
    const level = rms(pcm);
    const speaking = level > this.threshold;

    if (!speaking) this.noiseFloor = this.noiseFloor * 0.98 + level * 0.02;
    this.continuousSpeechMs = speaking ? this.continuousSpeechMs + ms : 0;

    if (!this.inSpeech) {
      this.preroll.push(pcm);
      if (this.preroll.length > 15) this.preroll.shift(); // keep ~300 ms before speech starts
      if (speaking) {
        this.speechMs += ms;
        if (this.speechMs >= 60) {
          this.inSpeech = true;
          this.silenceMs = 0;
          this.chunks = [...this.preroll];
          this.preroll = [];
          this.onSpeechStart?.();
        }
      } else {
        this.speechMs = 0;
      }
      return;
    }

    this.chunks.push(pcm);
    this.speechMs += ms;
    this.silenceMs = speaking ? 0 : this.silenceMs + ms;
    if (this.silenceMs >= this.endSilenceMs || this.speechMs >= this.maxUtteranceMs) {
      const audio = Buffer.concat(this.chunks);
      const voicedMs = this.speechMs - this.silenceMs;
      this.reset();
      if (voicedMs >= 250) this.onUtterance?.(audio);
    }
  }
}
