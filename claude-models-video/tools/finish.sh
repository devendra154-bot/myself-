set -e
cd ~/v; mkdir -p out
# linear gain to -14 LUFS + -1 dBFS limiter
I=$(ffmpeg -hide_banner -i audio/mix.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python3 -c "print(-14-($I))"); echo "integrated $I LUFS, gain $G dB"
ffmpeg -y -hide_banner -loglevel error -i audio/mix.wav -af "volume=${G}dB,alimiter=limit=0.891:level=false:attack=2:release=50" -ar 48000 -ac 2 out/final.wav
ffmpeg -y -hide_banner -loglevel error -framerate 30 -i frames/f%04d.jpg -i out/final.wav -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -movflags +faststart -c:a aac -b:a 192k -shortest out/claude_models_telugu_1080x1920.mp4
ffmpeg -y -hide_banner -loglevel error -i out/claude_models_telugu_1080x1920.mp4 -vf "scale=2160:3840:flags=lanczos" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -movflags +faststart -c:a copy out/claude_models_telugu_2160x3840_upscaled.mp4
ffprobe -v error -show_entries format=duration,size:stream=width,height,codec_name -of compact out/claude_models_telugu_1080x1920.mp4
ffmpeg -hide_banner -i out/claude_models_telugu_1080x1920.mp4 -af ebur128 -vf "freezedetect=n=0.001:d=0.4,blackdetect=d=0.1" -f null - 2>&1 | grep -E "freeze_start|black_start|^\s+I:|Peak" | tail -6 || true
ffmpeg -y -hide_banner -loglevel error -i out/claude_models_telugu_1080x1920.mp4 -vf "fps=1/5,scale=216:384,tile=6x2" -frames:v 1 out/qa_sheet.jpg
ls -la out
