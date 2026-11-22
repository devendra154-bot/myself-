import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/** 6-second Tenglish disclosure card: "this video is AI-made with HeyGen". */
export const Disclosure: React.FC<{ voice: "Mohan" | "Shruti" }> = ({ voice }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pop = (start: number) => spring({ frame: frame - start, fps, config: { damping: 14, mass: 0.8 } });
  const fade = Math.min(interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }), interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { extrapolateLeft: "clamp" }));
  const glow = 0.6 + 0.4 * Math.sin(frame / 6);
  const lines: [string, number, string, number][] = [
    ["మీకు తెలుసా?", 6, "#f5c542", 96],
    ["ఈ video లో ఉన్నది", 38, "#ffffff", 74],
    ["నేను కాదు!", 62, "#ff6b6b", 110],
    ["ఇది HeyGen తో create చేసిన", 100, "#ffffff", 62],
    ["AI video", 128, "#7fd7ff", 104],
  ];
  return (
    <AbsoluteFill style={{ opacity: fade, background: "radial-gradient(ellipse at 50% 40%, #2a1050 0%, #0d0620 55%, #000 100%)", fontFamily: "'Noto Sans Telugu', 'Nirmala UI', system-ui, sans-serif", alignItems: "center", justifyContent: "center" }}>
      {/* moving scan lines for a "digital" feel */}
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 2px, transparent 2px 8px)", transform: `translateY(${(frame * 2) % 8}px)` }} />
      <div style={{ position: "absolute", top: 230, padding: "16px 36px", borderRadius: 999, border: "3px solid #7fd7ff", color: "#7fd7ff", fontSize: 40, fontWeight: 800, letterSpacing: "0.25em",
        boxShadow: `0 0 ${30 * glow}px rgba(127,215,255,${0.6 * glow})`, transform: `scale(${pop(0)})` }}>🤖 AI GENERATED</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, padding: 60, textAlign: "center" }}>
        {lines.map(([t, start, color, size]) => {
          const p = pop(start);
          return <div key={t} style={{ color, fontSize: size, fontWeight: 800, lineHeight: 1.25, opacity: Math.min(1, p), transform: `translateY(${(1 - p) * 40}px) scale(${0.9 + 0.1 * p})`, textShadow: `0 0 24px ${color}66, 0 4px 0 #000` }}>{t}</div>;
        })}
      </div>
      <div style={{ position: "absolute", bottom: 200, color: "#aaa", fontSize: 32, letterSpacing: "0.1em", opacity: interpolate(frame, [130, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>Made with HeyGen · DevInventor</div>
      <Audio src={staticFile(`disclosure/disclosure_${voice}.mp3`)} />
    </AbsoluteFill>
  );
};
