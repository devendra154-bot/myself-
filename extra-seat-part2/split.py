"""Split the full render into 4 parts of exactly 72 s each.
Cuts fall on scene boundaries; each part is then time-fitted to 72 s
(video retimed, audio via pitch-preserving atempo).
Usage: python3 split.py <full_render.mp4> <out_dir>
"""
import sys, subprocess

SRC, OUT = sys.argv[1], sys.argv[2]
TARGET = 72.0
FONT = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
# scene boundaries (s): end of s06 "TAP TAP TAP", end of s12 old woman + ribbon,
# end of s18 lamp goes out, end of video
CUTS = [0.0, 67.87, 136.80, 218.11, 288.75]

for i in range(4):
    a, b = CUTS[i], CUTS[i + 1]
    f = TARGET / (b - a)                      # >1 slows down, <1 speeds up
    n = i + 1
    badge = f"THE EXTRA SEAT 2  •  PART {n}/4"
    vf = [f"trim={a}:{b}", f"setpts=(PTS-STARTPTS)*{f:.6f}", "fps=24",
          f"drawtext=fontfile={FONT}:text='{badge}':fontsize=40:fontcolor=white@0.85:"
          "x=(w-text_w)/2:y=110:box=1:boxcolor=black@0.45:boxborderw=18",
          "hqdn3d=4:3:8:6"]
    if n < 4:
        vf.append(f"drawtext=fontfile={FONT}:text='NEXT  →  PART {n + 1}/4':fontsize=58:"
                  "fontcolor=0xEB3C32:x=(w-text_w)/2:y=230:box=1:boxcolor=black@0.55:boxborderw=22:"
                  f"enable='gte(t,{TARGET - 3.0})'")
    af = (f"atrim={a}:{b},asetpts=PTS-STARTPTS,atempo={1 / f:.6f},"
          f"afade=t=in:d=0.3,afade=t=out:st={TARGET - 1.0}:d=1.0,apad")
    out = f"{OUT}/The_Extra_Seat_Part2_{n}of4.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", SRC,
                    "-vf", ",".join(vf), "-af", af, "-t", f"{TARGET}",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "25", "-maxrate", "6M", "-bufsize", "12M",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], check=True)
    print(f"part {n}: {a:.2f}-{b:.2f}s ({b - a:.2f}s) x{f:.3f} -> {out}")
