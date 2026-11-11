import { test } from "node:test";
import assert from "node:assert/strict";
import { mulawToPcm16, VoiceDetector, pcm16ToWav } from "../src/audio.js";
import { normalisePhone } from "../src/time.js";
import { parseContacts } from "../src/campaigns.js";

test("mu-law decodes silence and peaks", () => {
  const pcm = mulawToPcm16(Buffer.from([0xff, 0x00, 0x80]));
  assert.equal(pcm.readInt16LE(0), 0);
  assert.equal(pcm.readInt16LE(2), -32124);
  assert.equal(pcm.readInt16LE(4), 32124);
});

test("wav header is 44 bytes and sized right", () => {
  const wav = pcm16ToWav(Buffer.alloc(100));
  assert.equal(wav.length, 144);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(40), 100);
});

test("voice detector finds one utterance", () => {
  const got = [];
  let started = 0;
  const vad = new VoiceDetector({ onSpeechStart: () => started++, onUtterance: (a) => got.push(a) });
  const frame = (loud) => Buffer.alloc(160, loud ? 0x00 : 0xff);
  for (let i = 0; i < 20; i++) vad.push(frame(false));
  for (let i = 0; i < 30; i++) vad.push(frame(true));
  for (let i = 0; i < 50; i++) vad.push(frame(false));
  assert.equal(started, 1);
  assert.equal(got.length, 1);
});

test("short noise is ignored", () => {
  const got = [];
  const vad = new VoiceDetector({ onUtterance: (a) => got.push(a) });
  for (let i = 0; i < 5; i++) vad.push(Buffer.alloc(160, 0x00));
  for (let i = 0; i < 60; i++) vad.push(Buffer.alloc(160, 0xff));
  assert.equal(got.length, 0);
});

test("phone numbers are normalised to E.164", () => {
  assert.equal(normalisePhone("98765 43210"), "+919876543210");
  assert.equal(normalisePhone("09876543210"), "+919876543210");
  assert.equal(normalisePhone("919876543210"), "+919876543210");
  assert.equal(normalisePhone("+14155550100"), "+14155550100");
  assert.equal(normalisePhone("123"), null);
});

test("CSV contacts with and without header", () => {
  const a = parseContacts("name,phone,city\nRahul,9876543210,Noida\nPriya,9123456780,Pune");
  assert.deepEqual(a[0], { phone: "9876543210", name: "Rahul", vars: { city: "Noida" } });
  const b = parseContacts("9876543210,Rahul\n9123456780");
  assert.equal(b[1].phone, "9123456780");
  assert.equal(b[0].name, "Rahul");
});

test("plans map to models; Haiku requests skip server-side fallbacks", async () => {
  const { baseParams, modelFor } = await import("../src/claude.js");
  assert.equal(modelFor({ plan: "basic" }), "claude-haiku-5-5");
  assert.equal(modelFor({ plan: "standard" }), "claude-sonnet-5-5");
  assert.equal(modelFor({ plan: "premium" }), "claude-opus-5-5");
  const haiku = baseParams({ model: "claude-haiku-5-5" });
  assert.equal(haiku.fallbacks, undefined);
  assert.equal(baseParams({ model: "claude-sonnet-5-5" }).fallbacks, "default");
});

test("a 90-second standard call is priced at ₹9", async () => {
  const { priceCall } = await import("../src/billing.js");
  const call = { answeredAt: "2026-01-01T10:00:00Z", durationSec: 90, usage: { claudeInr: 1.2, ttsChars: 600, sttSeconds: 40 } };
  const b = priceCall(call, { plan: "standard" });
  assert.equal(b.price, 9);
  assert.equal(b.ratePerMin, 6);
  assert.ok(b.estCost > 0 && b.estCost < b.price);
  assert.equal(b.margin, Math.round((b.price - b.estCost) * 100) / 100);
  assert.equal(priceCall({ durationSec: 0 }, { plan: "basic" }).price, 0); // unanswered calls are free
});
