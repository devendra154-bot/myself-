import { Composition } from "remotion";
import { CinematicIntro, introSchemaDefaults } from "./CinematicIntro";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="CinematicIntro" component={CinematicIntro} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={introSchemaDefaults} />
    <Composition id="CinematicIntroVertical" component={CinematicIntro} durationInFrames={240} fps={30} width={1080} height={1920} defaultProps={introSchemaDefaults} />
  </>
);
