#!/usr/bin/env python3
"""
Edge TTS 音频生成脚本

特性：
- 免费、无需 API Key
- 支持多种中文语音
- 自动获取音频时长

用法：
    python scripts/generate_audio_edge.py

依赖：
    pip install edge-tts
"""

import asyncio
import os
import subprocess
from pathlib import Path

# Use this environment's proxy CA bundle if present (edge-tts pins certifi's bundle).
if os.path.exists("/root/.ccr/ca-bundle.crt"):
    import certifi
    certifi.where = lambda: "/root/.ccr/ca-bundle.crt"

try:
    import edge_tts
except ImportError:
    print("❌ 请先安装 edge-tts: pip install edge-tts")
    exit(1)

# Scenes: "Jatayu's Last Flight" in Tenglish (Telugu + English).
# Voices: te-IN-MohanNeural (male), te-IN-ShrutiNeural (female). rate/pitch shape each character.
MOHAN, SHRUTI = "te-IN-MohanNeural", "te-IN-ShrutiNeural"
VOICE = MOHAN  # default voice
SCENES = [
    {"id": "01-narrator", "voice": MOHAN, "text": "మేఘాల పైన, Ravana golden flying chariot లో Lanka వైపు super fast గా వెళ్తున్నాడు."},
    {"id": "02-narrator", "voice": MOHAN, "text": "ఆ chariot లో, Sita ని బంధించి తీసుకెళ్తున్నాడు."},
    {"id": "03-sita", "voice": SHRUTI, "pitch": "+4Hz", "text": "Help! ఎవరైనా నన్ను save చేయండి, please!"},
    {"id": "04-ravana", "voice": MOHAN, "pitch": "-12Hz", "rate": "-10%", "text": "హ హ హ! నన్ను ఎవ్వరూ stop చేయలేరు! I am Ravana!"},
    {"id": "05-narrator", "voice": MOHAN, "text": "కానీ King Dasharatha friend, mighty bird Jatayu, Sita cry విన్నాడు."},
    {"id": "06-jatayu", "voice": MOHAN, "pitch": "+4Hz", "text": "Stop, Ravana! ఆమెని వదిలెయ్! ఇది నా last warning!"},
    {"id": "07-narrator", "voice": MOHAN, "text": "Jatayu తన claws తో, wings తో attack చేసి, Ravana chariot ని break చేశాడు."},
    {"id": "08-ravana", "voice": MOHAN, "pitch": "-12Hz", "rate": "-10%", "text": "ఓరి foolish old bird! నీకు ఎంత ధైర్యం!"},
    {"id": "09-narrator", "voice": MOHAN, "text": "అప్పుడు Ravana తన sword ఎత్తి, Jatayu wing ని cut చేశాడు."},
    {"id": "10-narrator", "voice": MOHAN, "text": "Jatayu భూమి మీద పడిపోయాడు. Ravana, Sita తో Lanka కి వెళ్ళిపోయాడు."},
    {"id": "11-narrator", "voice": MOHAN, "text": "కానీ brave Jatayu, Rama కి truth చెప్పడానికి, ప్రాణాలతో wait చేశాడు."},
    {"id": "12-ending", "voice": SHRUTI, "text": "Sita ని కాపాడటానికి Jatayu తన life ఇచ్చాడు. The bravest heart in the sky."},
]

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "audio" / "tenglish"


def get_audio_duration(file_path: Path) -> float:
    """用 ffprobe 获取音频时长"""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(file_path)],
        capture_output=True, text=True
    )
    return float(result.stdout.strip()) if result.stdout.strip() else 0


async def generate_audio(scene: dict, output_dir: Path) -> dict:
    """生成单个场景的音频"""
    output_file = output_dir / f"{scene['id']}.mp3"
    communicate = edge_tts.Communicate(scene["text"], scene.get("voice", VOICE),
                                       rate=scene.get("rate", "+0%"), pitch=scene.get("pitch", "+0Hz"))
    await communicate.save(str(output_file))

    duration = get_audio_duration(output_file)
    frames = round(duration * 30)  # 30fps
    return {"id": scene["id"], "file": f"{scene['id']}.mp3", "duration": duration, "frames": frames}


async def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("🎙️  Edge TTS (Voices: Mohan + Shruti, Tenglish)")
    print(f"📁 输出目录: {OUTPUT_DIR}")
    print("=" * 60)

    results = []
    for i, scene in enumerate(SCENES, 1):
        print(f"[{i}/{len(SCENES)}] {scene['id']}: 生成中...", end=" ", flush=True)
        try:
            result = await generate_audio(scene, OUTPUT_DIR)
            results.append(result)
            print(f"✅ {result['duration']:.2f}s ({result['frames']} frames)")
        except Exception as e:
            print(f"❌ {e}")

    print("=" * 60)
    print(f"✅ 完成: {len(results)} 个音频文件")

    # 输出配置供 Remotion 使用
    print("\n📝 audioConfig 数据:")
    for r in results:
        print(f'  {{ id: "{r["id"]}", file: "{r["file"]}", frames: {r["frames"]} }},')


if __name__ == "__main__":
    asyncio.run(main())
