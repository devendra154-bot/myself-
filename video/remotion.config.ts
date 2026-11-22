import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
// On machines where Remotion can't download its own browser (like cloud sandboxes),
// point it at an installed Chrome/Chromium with the REMOTION_BROWSER env variable.
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
