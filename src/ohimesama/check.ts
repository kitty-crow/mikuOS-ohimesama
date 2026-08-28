import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { Tree, TreeEnt } from "../fs/tree.js";
import type { TetoImageProvider } from "../teto/loader.js";
import type { WebRootManifest } from "../main/webroot-format.js";
import { Ohimesama } from "./os.js";
import {
  OHIMESAMA_BASE_PATHS,
  OHIMESAMA_FORBIDDEN_PREFIXES,
  OHIMESAMA_REQUIRED_PATHS,
} from "./profile.js";
import type { RootRow } from "./profile.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const stage = path.join(root, "build", "ohimesama", "root-stage");
const output = path.join(root, "dist", "ohimesama");
const manifestPath = path.join(output, "root", "manifest.json");

const fail = (message: string): never => {
  throw new Error(`mikuOS お姫様 invariant failed: ${message}`);
};

const manifest = JSON.parse(
  await fs.readFile(manifestPath, "utf8"),
) as WebRootManifest;

const paths = new Set(manifest.entries.map(entry => entry.p));

for (const required of OHIMESAMA_REQUIRED_PATHS) {
  if (!paths.has(required)) fail(`missing required path ${required}`);
}

for (const entry of manifest.entries) {
  if (!OHIMESAMA_BASE_PATHS.has(entry.p)) {
    fail(`unexpected base-image path ${entry.p}`);
  }

  for (const prefix of OHIMESAMA_FORBIDDEN_PREFIXES) {
    if (entry.p.startsWith(prefix)) {
      fail(`interactive/development path escaped stripping: ${entry.p}`);
    }
  }

  if (entry.k === "l") {
    fail(`base image must not contain symlinks: ${entry.p}`);
  }
}

const runtimeFiles = manifest.entries.filter(entry =>
  entry.k === "f" &&
  (entry.p.startsWith("/usr/bin/") || entry.p.startsWith("/usr/lib/")),
);

if (runtimeFiles.length) {
  fail(`base image contains runtime payload before a runtime is selected: ${runtimeFiles.map(x => x.p).join(", ")}`);
}

const passwd = await fs.readFile(path.join(stage, "etc", "passwd"), "utf8");
const group = await fs.readFile(path.join(stage, "etc", "group"), "utf8");

if (passwd.includes("/bin/thsh") || passwd.includes("/bin/bash") || passwd.includes("/bin/sh")) {
  fail("an interactive shell remains in /etc/passwd");
}

if (!passwd.includes("root:x:0:0:") || !passwd.includes("service:x:1000:1000:")) {
  fail("root/service identities are not present");
}

if (!group.includes("root:x:0:") || !group.includes("service:x:1000:")) {
  fail("root/service groups are not present");
}

if (manifest.core.packedSize > 64 * 1024) {
  fail(`bare root exceeds 64 KiB packed budget (${manifest.core.packedSize} bytes)`);
}

const raw = JSON.parse(
  await fs.readFile(path.join(stage, ".thistle-meta.json"), "utf8"),
) as { ent?: RootRow[] };

if (!Array.isArray(raw.ent)) fail("staged root metadata is missing");

const entries: TreeEnt[] = await Promise.all(raw.ent.map(async row => {
  if (row.k !== "f") return { ...row } as TreeEnt;
  const data = Uint8Array.from(await fs.readFile(path.join(stage, row.p.slice(1))));
  return { ...row, data } as TreeEnt;
}));

class MemoryRoot implements Tree {
  readonly label = "お姫様 CI root";
  async pull(): Promise<TreeEnt[]> { return entries; }
  async push(): Promise<void> { fail("headless OS attempted to persist its immutable base root"); }
}

const tetoBytes = Uint8Array.from(await fs.readFile(path.join(output, "teto.wasm")));
const teto: TetoImageProvider = {
  async load() { return Uint8Array.from(tetoBytes); },
};

const os = new Ohimesama({ root: new MemoryRoot(), teto });
await os.ready;

if (os.init.pid !== 1 || os.init.ppid !== 0) fail("headless supervisor is not PID 1");
if (os.k.procs.size !== 1) fail(`bare boot created unexpected processes (${os.k.procs.size})`);
if (os.k.apps.size !== 0) fail(`bare boot installed unexpected built-in applications (${os.k.apps.size})`);
if (os.k.name !== "Teto" || os.k.executionCore !== "Teto WebAssembly") {
  fail("bare boot did not select validated Teto execution");
}
if (os.init.cwd !== "/" || os.init.env.get("HOME") !== "/" || os.init.env.get("PATH") !== "/usr/bin") {
  fail("PID 1 environment is not the minimal headless environment");
}
for (const variable of ["SHELL", "TERM", "PS1"]) {
  if (os.init.env.has(variable)) fail(`interactive environment variable survived: ${variable}`);
}
if (os.s.read("/etc/passwd") !== passwd) fail("headless host loaded the wrong root image");

const hostInputs = JSON.parse(
  await fs.readFile(path.join(output, "host-inputs.json"), "utf8"),
) as string[];

if (!Array.isArray(hostInputs) || !hostInputs.length) fail("headless host dependency audit is empty");

console.log("mikuOS お姫様 base-image invariants: OK");
console.log(`paths: ${manifest.entries.length}`);
console.log(`packed root payload: ${manifest.core.packedSize} bytes`);
console.log(`headless host modules: ${hostInputs.length}`);
console.log("runtime payload: none");
console.log("interactive shell: none");
console.log("processes after bare boot: PID 1 only");
