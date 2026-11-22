import { Composition } from "remotion";
import { CinematicIntro, introSchemaDefaults } from "./CinematicIntro";
import { Disclosure } from "./Disclosure";
import { JatayuFilm, JATAYU_FRAMES } from "./jatayu/JatayuFilm";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="CinematicIntro" component={CinematicIntro} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={introSchemaDefaults} />
    <Composition id="CinematicIntroVertical" component={CinematicIntro} durationInFrames={240} fps={30} width={1080} height={1920} defaultProps={introSchemaDefaults} />
    <Composition id="JatayuFilm" component={JatayuFilm} durationInFrames={JATAYU_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="DisclosureMohan" component={Disclosure} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{ voice: "Mohan" as const }} />
    <Composition id="DisclosureShruti" component={Disclosure} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{ voice: "Shruti" as const }} />
  </>
);
