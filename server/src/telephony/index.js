import { config } from "../config.js";
import * as twilio from "./twilio.js";
import * as plivo from "./plivo.js";

export const providers = { twilio, plivo };

/** The provider used for outbound calls. Inbound calls use whichever provider calls our webhook. */
export function telephony() {
  const p = providers[config.telephony];
  if (!p) throw new Error(`Unknown TELEPHONY_PROVIDER "${config.telephony}" (use twilio or plivo)`);
  return p;
}
