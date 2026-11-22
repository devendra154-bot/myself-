import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, random } from "remotion";
// @ts-ignore  plain JS drawing library (canvas art for the characters and scenes)
import { JatayuArt } from "./art.js";
import timeline from "./timeline.json";
import { CinematicIntro } from "../CinematicIntro";

type Line = { who: string; text: string; file: string; start: number; end: number };
const FPS = timeline.fps;
const INTRO_FRAMES = Math.round(timeline.intro * FPS);
export const JATAYU_FRAMES = Math.round(timeline.total * FPS);
const COLORS: Record<string, string> = { narrator: "#ffffff", sita: "#ffb070", ravana: "#ff7070", jatayu: "#9ad0ff" };
const NAMES: Record<string, string> = { sita: "SITA", ravana: "RAVANA", jatayu: "JATAYU" };

/** Draws the story art for the current frame onto a 1080x1920 canvas (art is authored at 720x1280). */
const StoryCanvas: React.FC<{ scene: number; t: number; dur: number; lines: Line[] }> = ({ scene, t, dur, lines }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    const art = JatayuArt.make(ctx);
    const info: Record<string, number | boolean> = { noTitle: true };
    lines.forEach((l) => { if (info[l.who] === undefined) info[l.who] = l.start; });
    ctx.save(); ctx.setTransform(c.width / 720, 0, 0, c.height / 1280, 0, 0);
    art.scenes[scene](t, dur, info);
    ctx.restore();
  }, [scene, t, dur, lines]);
  return <canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} />;
};

/** Soft god-rays + dust for atmosphere. */
const Atmosphere: React.FC<{ strength: number }> = ({ strength }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.35 * strength }}>
        {[-22, -8, 6, 19].map((a, i) => (
          <div key={i} style={{ position: "absolute", left: "62%", top: "-15%", width: 180 + i * 50, height: "140%", transformOrigin: "50% 0%",
            transform: `translateX(-50%) rotate(${a + Math.sin(frame / 70 + i) * 4}deg)`, background: "linear-gradient(to bottom, rgba(255,225,160,.5), rgba(255,200,120,0) 75%)", filter: "blur(28px)" }} />
        ))}
      </AbsoluteFill>
      {new Array(40).fill(0).map((_, i) => {
        const x = random(`dx${i}`) * width + Math.sin(frame / 35 + i) * 25;
        const y = ((random(`dy${i}`) * height - frame * (0.5 + random(`ds${i}`))) % height + height) % height;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 4, height: 4, borderRadius: 2, background: "#fff0c8", opacity: 0.25 * strength }} />;
      })}
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame(); const seed = frame % 8;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.1, mixBlendMode: "overlay" }}>
        <filter id={`jg${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} /></filter>
        <rect width="100%" height="100%" filter={`url(#jg${seed})`} />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,.6) 100%)" }} />
    </AbsoluteFill>
  );
};

const Subtitle: React.FC<{ line: Line; local: number }> = ({ line, local }) => {
  const { fps } = useVideoConfig();
  const inP = spring({ frame: local, fps, config: { damping: 200 } });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, bottom: 230, textAlign: "center", transform: `translateY(${(1 - inP) * 30}px)`, opacity: inP }}>
      {NAMES[line.who] && <div style={{ color: COLORS[line.who], fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: 34, letterSpacing: "0.2em", marginBottom: 12, textShadow: "0 2px 8px #000" }}>{NAMES[line.who]}</div>}
      <span style={{ background: "rgba(0,0,0,.6)", color: COLORS[line.who], fontFamily: "system-ui, sans-serif", fontWeight: 600, fontSize: 50, lineHeight: 1.45, padding: "8px 20px", borderRadius: 12, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{line.text}</span>
    </div>
  );
};

const StoryScene: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const sc = timeline.scenes[index];
  const t = frame / FPS, durF = Math.round(sc.dur * FPS);
  const push = interpolate(frame, [0, durF], [1.0, 1.07]);
  const fade = Math.min(interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }), interpolate(frame, [durF - 8, durF], [1, 0], { extrapolateLeft: "clamp" }));
  const lines = sc.lines as Line[];
  const current = [...lines].reverse().find((l) => t >= l.start - 0.05 && t < l.end + 0.35);
  const last = index === timeline.scenes.length - 1;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ opacity: fade, transform: `scale(${push})`, filter: "contrast(1.08) saturate(1.12)" }}>
        <StoryCanvas scene={index} t={t} dur={sc.dur} lines={lines} />
        {!last && <Atmosphere strength={index === 3 || index === 4 ? 0.5 : 1} />}
      </AbsoluteFill>
      {!last && current && <Subtitle key={current.file} line={current} local={Math.round((t - current.start) * FPS)} />}
      {lines.map((l) => (
        <Sequence key={l.file} from={Math.round(l.start * FPS)}><Audio src={staticFile(l.file)} volume={1} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const JatayuFilm: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Sequence durationInFrames={INTRO_FRAMES}>
      <CinematicIntro presents="DEVINVENTOR STUDIOS PRESENTS" title="JATAYU'S LAST FLIGHT" tagline="A Ramayana story" />
    </Sequence>
    {timeline.scenes.map((sc, i) => (
      <Sequence key={i} from={Math.round(sc.start * FPS)} durationInFrames={Math.round(sc.dur * FPS)}>
        <StoryScene index={i} />
      </Sequence>
    ))}
    <Grain />
    <Audio src={staticFile("jatayu/bed.wav")} volume={0.85} />
  </AbsoluteFill>
);
