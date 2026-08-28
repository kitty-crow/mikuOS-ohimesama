import type { TetoImageProvider } from "../teto/loader.js";
import { Ohimesama } from "./os.js";
import type { OhimesamaHost } from "./os.js";
import { OhimesamaStaticRoot } from "./static-root.js";

export { Ohimesama } from "./os.js";
export type { OhimesamaHost } from "./os.js";
export { OhimesamaStaticRoot } from "./static-root.js";

export interface WebOhimesamaOptions extends Omit<OhimesamaHost, "root" | "teto"> {
  base: URL;
}

const webTetoProvider = (base: URL): TetoImageProvider => {
  let baseline: Promise<Uint8Array<ArrayBuffer>> | undefined;

  return {
    load(variant) {
      if (variant !== "baseline") {
        return Promise.reject(new Error("mikuOS お姫様 does not include threaded Teto"));
      }

      if (!baseline) {
        baseline = fetch(new URL("teto.wasm", base), { cache: "no-store" })
          .then(async response => {
            if (!response.ok) throw new Error(`teto.wasm: HTTP ${response.status}`);
            return new Uint8Array(await response.arrayBuffer());
          });
      }

      return baseline;
    },
  };
};

/** Boot the standard immutable browser/Worker distribution from an asset root. */
export const webOhimesama = (options: WebOhimesamaOptions): Ohimesama => {
  const { base, ...host } = options;
  return new Ohimesama({
    ...host,
    root: new OhimesamaStaticRoot(new URL("root/", base)),
    teto: webTetoProvider(base),
  });
};
