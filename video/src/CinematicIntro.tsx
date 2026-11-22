import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing, random } from "remotion";

export const introSchemaDefaults = {
  presents: "DEVINVENTOR STUDIOS PRESENTS",
  title: "JATAYU'S LAST FLIGHT",
  tagline: "The bravest heart in the sky",
};
type Props = typeof introSchemaDefaults;

const gold = "#f5c542";

/** Letterbox bars that slide in to a 2.39:1 "scope" frame. */
const Letterbox: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const target = Math.max(0, (height - width / 2.39) / 2);
  const bar = interpolate(frame, [0, 25], [0, target], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: bar, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: bar, background: "#000" }} />
    </>
  );
};

/** Floating dust particles caught in the light. */
const Dust: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <>
      {new Array(70).fill(0).map((_, i) => {
        const x = random(`x${i}`) * width + Math.sin(frame / 40 + i) * 30;
        const y = ((random(`y${i}`) * height - frame * (0.4 + random(`s${i}`) * 0.8)) % height + height) % height;
        const r = 1 + random(`r${i}`) * 3;
        const o = 0.15 + 0.5 * Math.abs(Math.sin(frame / 25 + i));
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: r * 2, height: r * 2, borderRadius: "50%", background: "#ffe9b0", opacity: o, filter: "blur(0.5px)" }} />;
      })}
    </>
  );
};

/** Sweeping volumetric light rays from the top. */
const LightRays: React.FC = () => {
  const frame = useCurrentFrame();
  const sweep = Math.sin(frame / 60) * 8;
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: interpolate(frame, [10, 60], [0, 0.6], { extrapolateRight: "clamp" }) }}>
      {[-30, -12, 5, 20, 34].map((a, i) => (
        <div key={i} style={{ position: "absolute", left: "50%", top: "-20%", width: 160 + i * 40, height: "160%", transformOrigin: "50% 0%", transform: `translateX(-50%) rotate(${a + sweep}deg)`,
          background: "linear-gradient(to bottom, rgba(255,220,150,0.35), rgba(255,200,120,0) 70%)", filter: "blur(30px)" }} />
      ))}
    </AbsoluteFill>
  );
};

/** Animated film grain + vignette. */
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = frame % 8;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.12, mixBlendMode: "overlay" }}>
        <filter id={`g${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} /></filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)" }} />
    </AbsoluteFill>
  );
};

export const CinematicIntro: React.FC<Props> = ({ presents, title, tagline }) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const vertical = width < 1200;
  const push = interpolate(frame, [0, durationInFrames], [1.0, 1.12]);           // slow camera push-in
  const presentsO = interpolate(frame, [20, 40, 80, 95], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleIn = spring({ frame: frame - 95, fps, config: { damping: 200, mass: 1.2 } });
  const spacing = interpolate(titleIn, [0, 1], [0.6, 0.18]);
  const flare = interpolate(frame, [95, 110, 140], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagO = interpolate(frame, [140, 165], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const base = vertical ? 92 : 128;

  return (
    <AbsoluteFill style={{ background: "#050208", opacity: fadeIn * fadeOut, fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 35%, #4a1a12 0%, #1a0808 45%, #050208 80%)" }} />
        <LightRays />
        <Dust />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: 60 }}>
          <div style={{ position: "absolute", color: "#d8cfc4", fontSize: vertical ? 30 : 34, letterSpacing: "0.5em", opacity: presentsO }}>{presents}</div>
          <div style={{ color: gold, fontSize: base, fontWeight: 700, letterSpacing: `${spacing}em`, opacity: titleIn, lineHeight: 1.1,
            textShadow: "0 0 40px rgba(245,197,66,0.55), 0 4px 0 #6a3a08", transform: `scale(${interpolate(titleIn, [0, 1], [1.15, 1])})` }}>{title}</div>
          <div style={{ marginTop: 40, color: "#f2e8dc", fontSize: vertical ? 34 : 40, fontStyle: "italic", opacity: tagO }}>{tagline}</div>
        </AbsoluteFill>
        {/* anamorphic lens flare on the title reveal */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 6, transform: "translateY(-50%)", opacity: flare,
          background: "linear-gradient(90deg, rgba(120,180,255,0), rgba(160,210,255,0.9), rgba(120,180,255,0))", filter: "blur(3px)" }} />
      </AbsoluteFill>
      <Grain />
      <Letterbox />
    </AbsoluteFill>
  );
};
