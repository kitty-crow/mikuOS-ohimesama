import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT_IMAGE_VERSION } from "../main/image.js";
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

const raw = JSON.parse(
  await fs.readFile(path.join(source, ".thistle-meta.json"), "utf8"),
) as RootMeta;

if (!Array.isArray(raw.ent)) {
  throw new Error("canonical mikuOS root metadata has no entry table");
}

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
  ROOT_IMAGE_VERSION,
).build();

const profile = {
  format: 1,
  profile: "mikuOS お姫様",
  profileVersion: OHIMESAMA_PROFILE_VERSION,
  rootImageVersion: ROOT_IMAGE_VERSION,
  runtime: null,
  application: null,
  entries: manifest.entries.length,
  packedBytes: manifest.core.packedSize,
  unpackedBytes: manifest.core.unpackedSize,
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
