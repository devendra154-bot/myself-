"""Voice samples with OmniVoice, the voice engine VoiceStudio runs locally.
Voice *design* mode: each voice is described in words (gender, age, pitch, accent) instead of cloned.
Model: k2-fsa/OmniVoice (code Apache-2.0, model weights CC-BY-NC: non-commercial use only).
Usage: python omnivoice_samples.py [only_id]
"""
import sys, time, torch, soundfile as sf
from pathlib import Path
from omnivoice import OmniVoice

OUT = Path(__file__).resolve().parent.parent / "samples" / "voicestudio"; OUT.mkdir(parents=True, exist_ok=True)
SAMPLES = [
    ("1_narrator_male", "male, middle-aged, moderate pitch, indian accent", "Telugu",
     "మేఘాల పైన, Ravana golden flying chariot లో Lanka వైపు super fast గా వెళ్తున్నాడు."),
    ("2_sita_female", "female, young adult, high pitch, indian accent", "Telugu",
     "Help! ఎవరైనా నన్ను save చేయండి, please!"),
    ("3_ravana_deep", "male, middle-aged, very low pitch, indian accent", "Telugu",
     "హ హ హ! నన్ను ఎవ్వరూ stop చేయలేరు! I am Ravana!"),
    ("4_jatayu_elderly", "male, elderly, low pitch, indian accent", "Telugu",
     "Stop, Ravana! ఆమెని వదిలెయ్! ఇది నా last warning!"),
    ("5_english_narrator", "male, young adult, moderate pitch, indian accent", "English",
     "High above the clouds, Ravana's golden flying chariot raced towards Lanka."),
    ("6_whisper_female", "female, young adult, whisper", "English",
     "Shh... listen carefully. The bravest heart in the sky is about to fly."),
]
only = sys.argv[1] if len(sys.argv) > 1 else None
t0 = time.time()
model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cpu", dtype=torch.float32)
print(f"model loaded in {time.time()-t0:.0f}s", flush=True)
for sid, instruct, lang, text in SAMPLES:
    if only and not sid.startswith(only): continue
    t = time.time()
    audio = model.generate(text=text, instruct=instruct, language=lang)
    sf.write(OUT / f"{sid}.wav", audio[0], 24000)
    print(f"{sid}: {len(audio[0])/24000:.1f}s audio in {time.time()-t:.0f}s  [{instruct}]", flush=True)
