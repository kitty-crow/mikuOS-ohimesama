import { fetchTetoProvider } from "../teto/provider.js";
import { Ohimesama } from "./os.js";
import type { OhimesamaHost } from "./os.js";
import { OhimesamaStaticRoot } from "./static-root.js";

export { Ohimesama } from "./os.js";
export type { OhimesamaHost } from "./os.js";
export { OhimesamaStaticRoot } from "./static-root.js";

export interface WebOhimesamaOptions extends Omit<OhimesamaHost, "root" | "teto"> {
  base: URL;
}

/** Boot the standard immutable browser/Worker distribution from an asset root. */
export const webOhimesama = (options: WebOhimesamaOptions): Ohimesama => {
  const base = options.base;
  return new Ohimesama({
    ...options,
    root: new OhimesamaStaticRoot(new URL("root/", base)),
    teto: fetchTetoProvider(base),
  });
};
