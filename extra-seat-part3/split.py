"""Split the full Part 3 render into 5 Reels, cut on scene boundaries (no speed change).
Usage: python3 split.py <full_render.mp4> <work_dir> <out_dir>
"""
import sys, json, subprocess

SRC, WORK, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FONT = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
# a part ends after: s06 the "ర" drawing, s10 whistle at night, s15 the 1994 flashback,
# s20 father and son, s25 end card
ENDS = ["s06", "s10", "s15", "s20", "s25"]

tl = {x["id"]: x["start"] + x["dur"] for x in json.load(open(f"{WORK}/timeline.json"))}
CUTS = [0.0] + [tl[e] for e in ENDS]
N = len(ENDS)

for i in range(N):
    a, b = CUTS[i], CUTS[i + 1]; n = i + 1; L = b - a
    vf = [f"trim={a}:{b}", "setpts=PTS-STARTPTS",
          f"drawtext=fontfile={FONT}:text='{n}/{N}':fontsize=44:fontcolor=white:x=w-text_w-50:y=60:box=1:boxcolor=black@0.5:boxborderw=16"]
    if n < N:
        vf.append(f"drawtext=fontfile={FONT}:text='>>  {n + 1}/{N}':fontsize=56:fontcolor=0xEB3C32:"
                  "x=(w-text_w)/2:y=230:box=1:boxcolor=white@0.85:boxborderw=22:" f"enable='gte(t,{L - 2.5})'")
    af = f"atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.2,afade=t=out:st={L - 0.6}:d=0.6"
    out = f"{OUT}/Adanapu_Seatu_Part3_{n}of{N}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", SRC, "-vf", ",".join(vf), "-af", af,
                    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], check=True)
    print(f"part {n}: {a:.1f}-{b:.1f}s ({L:.1f}s) -> {out}")
