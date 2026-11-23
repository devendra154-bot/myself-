"""Generate the Telugu voiceover lines with Meta MMS-TTS (facebook/mms-tts-tel), CPU only.
Usage: python3 make_vo.py <lines.json> <outdir>"""
import json, sys, os, torch, numpy as np, scipy.io.wavfile as wav
from transformers import VitsModel, AutoTokenizer
lines = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
tok = AutoTokenizer.from_pretrained("facebook/mms-tts-tel")
model = VitsModel.from_pretrained("facebook/mms-tts-tel").eval()
# father speaks a little slower (older), son a little quicker (urgent)
rate = {"narrator": 1.0, "son": 0.97, "father": 1.08}
for L in lines:
    model.speaking_rate = 1.0 / rate[L["who"]]
    torch.manual_seed(7)
    inputs = tok(L["te"], return_tensors="pt")
    with torch.no_grad():
        y = model(**inputs).waveform[0].numpy()
    y = y / (np.abs(y).max() + 1e-9) * 0.9
    wav.write(f"{out}/{L['id']}.wav", model.config.sampling_rate, (y * 32767).astype(np.int16))
    print(L["id"], round(len(y) / model.config.sampling_rate, 2))
