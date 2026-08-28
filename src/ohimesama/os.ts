import { DEFAULT_CONFIG } from "../core/config.js";
import type { SystemConfig } from "../core/config.js";
import { Kern } from "../core/kernel.js";
import type { Proc } from "../core/proc.js";
import { Sys } from "../core/sys.js";
import { treeFs } from "../fs/tree.js";
import type { Tree } from "../fs/tree.js";
import { Net } from "../net/net.js";
import type { TetoImageProvider } from "../teto/loader.js";
import { validateTetoProvider } from "../teto/provider.js";

export interface OhimesamaHost {
  root: Tree;
  teto: TetoImageProvider;
  net?: Net;
  config?: SystemConfig;
  setId?: boolean;
}

/**
 * Minimal non-interactive mikuOS host.
 *
 * It deliberately creates only the canonical kernel and PID 1. No shell,
 * terminal, login session, persistence layer or user-facing mikuOS image is
 * instantiated. The layer above お姫様 may claim PID 1 as its supervisor.
 */
export class Ohimesama {
  readonly k: Kern;
  readonly init: Proc;
  readonly s: Sys;
  readonly ready: Promise<void>;

  constructor(readonly host: OhimesamaHost) {
    this.k = new Kern(
      host.net ?? new Net(),
      undefined,
      host.config ?? DEFAULT_CONFIG,
      host.setId ?? false,
      host.teto,
    );

    this.init = this.k.init();
    this.s = new Sys(this.k, this.init);
    this.ready = this.start();
  }

  private async start(): Promise<void> {
    const entries = await this.host.root.pull();
    if (!entries?.length) throw new Error("mikuOS お姫様 root is empty");

    treeFs.load(this.k.fs, entries);
    await validateTetoProvider(this.host.teto);

    this.k.name = "Teto";
    this.k.executionCore = "Teto WebAssembly";

    this.init.cmd = "init";
    this.init.argv = ["init"];
    this.init.cwd = "/";
    this.init.state = "sleep";
    this.init.env = new Map([
      ["PATH", "/usr/bin"],
      ["HOME", "/"],
      ["USER", "root"],
      ["PWD", "/"],
      ["LANG", "C.UTF-8"],
      ["MIKUOS_KERNEL_MODE", "teto"],
      ["THISTLE_RV_CORE", "teto-wasm-core"],
      ["THISTLE_TETO_STRICT", "0"],
    ]);

    this.k.log(`ohimesama: immutable root loaded from ${this.host.root.label}`);
    this.k.log("ohimesama: Teto validated; headless PID 1 ready");
  }
}
