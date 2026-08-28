import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { WebRootPackage } from "../main/webroot.js";
import {
  OHIMESAMA_GROUP,
  OHIMESAMA_OS_RELEASE,
  OHIMESAMA_PASSWD,
  OHIMESAMA_PROFILE_VERSION,
  OHIMESAMA_REQUIRED_PATHS,
  keepOhimesamaBasePath,
} from "./profile.js";
import type { RootRow } from "./profile.js";

interface RootMeta {
  image?: number;
  ent?: RootRow[];
  [key: string]: unknown;
}

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = path.join(root, ".thistle.base");
const stage = path.join(root, "build", "ohimesama", "root-stage");
const output = path.join(root, "dist", "ohimesama");
const packaged = path.join(output, "root");
const hostBundle = path.join(output, "ohimesama.js");
const tetoSource = path.join(root, "dist", "teto", "teto.wasm");
const tetoOutput = path.join(output, "teto.wasm");

const forbiddenHostInputs = [
  "/sh/",
  "/io/tty.js",
  "/main/boot.js",
  "/main/cli.js",
  "/main/image.js",
  "/main/server.js",
  "/main/session.js",
  "/main/web.js",
  "/main/websession.js",
  "/main/webtree.js",
  "/apps/index.js",
  "/@xterm/",
] as const;

const raw = JSON.parse(
  await fs.readFile(path.join(source, ".thistle-meta.json"), "utf8"),
) as RootMeta;

if (!Array.isArray(raw.ent)) {
  throw new Error("canonical mikuOS root metadata has no entry table");
}
if (!Number.isSafeInteger(raw.image) || (raw.image ?? -1) < 0) {
  throw new Error("canonical mikuOS root metadata has no valid image version");
}

const rootImageVersion = raw.image!;
const rows = raw.ent.filter(row => keepOhimesamaBasePath(row.p));
const paths = new Set(rows.map(row => row.p));

for (const required of OHIMESAMA_REQUIRED_PATHS) {
  if (!paths.has(required)) {
    throw new Error(`canonical root does not provide required お姫様 path ${required}`);
  }
}

await fs.rm(stage, { recursive: true, force: true });
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(stage, { recursive: true });
await fs.mkdir(output, { recursive: true });

for (const row of rows) {
  const destination = path.join(stage, row.p.slice(1));

  if (row.k === "d") {
    await fs.mkdir(destination, { recursive: true });
    continue;
  }

  if (row.k !== "f") continue;

  const original = path.join(source, row.p.slice(1));
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(original, destination);
}

await Promise.all([
  fs.writeFile(path.join(stage, "etc", "passwd"), OHIMESAMA_PASSWD),
  fs.writeFile(path.join(stage, "etc", "group"), OHIMESAMA_GROUP),
  fs.writeFile(path.join(stage, "etc", "os-release"), OHIMESAMA_OS_RELEASE),
]);

await fs.writeFile(
  path.join(stage, ".thistle-meta.json"),
  JSON.stringify({ ...raw, ent: rows }, null, 2) + "\n",
);

const manifest = await new WebRootPackage(
  stage,
  packaged,
  rootImageVersion,
).build();

const bundled = await esbuild({
  entryPoints: [path.join(root, "build", "ohimesama", "index.js")],
  outfile: hostBundle,
  bundle: true,
  platform: "browser",
  format: "esm",
  target: ["es2022"],
  minify: true,
  treeShaking: true,
  legalComments: "none",
  metafile: true,
  logLevel: "silent",
});

const hostInputs = Object.keys(bundled.metafile.inputs)
  .map(input => input.replaceAll("\\", "/"))
  .sort();

for (const input of hostInputs) {
  const normal = `/${input}`;
  const forbidden = forbiddenHostInputs.find(part => normal.includes(part));
  if (forbidden) {
    throw new Error(`headless host pulled forbidden interactive module ${input} (${forbidden})`);
  }
}

await fs.writeFile(
  path.join(output, "host-inputs.json"),
  JSON.stringify(hostInputs, null, 2) + "\n",
);

await fs.copyFile(tetoSource, tetoOutput);

const [hostStat, tetoStat] = await Promise.all([
  fs.stat(hostBundle),
  fs.stat(tetoOutput),
]);

const profile = {
  format: 1,
  profile: "mikuOS お姫様",
  profileVersion: OHIMESAMA_PROFILE_VERSION,
  rootImageVersion,
  runtime: null,
  application: null,
  entries: manifest.entries.length,
  packedBytes: manifest.core.packedSize,
  unpackedBytes: manifest.core.unpackedSize,
  hostBytes: hostStat.size,
  hostModules: hostInputs.length,
  tetoBytes: tetoStat.size,
};

await fs.writeFile(
  path.join(output, "profile.json"),
  JSON.stringify(profile, null, 2) + "\n",
);

console.log(
  `mikuOS お姫様: ${manifest.entries.length} paths, ` +
  `${manifest.core.unpackedSize} eager bytes, ` +
  `${manifest.core.packedSize} packed bytes`,
);
console.log(
  `headless host: ${hostStat.size} bytes from ${hostInputs.length} modules; ` +
  `Teto: ${tetoStat.size} bytes`,
);
