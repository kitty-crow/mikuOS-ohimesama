import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { WebRootManifest } from "../main/webroot-format.js";
import {
  OHIMESAMA_BASE_PATHS,
  OHIMESAMA_FORBIDDEN_PREFIXES,
  OHIMESAMA_REQUIRED_PATHS,
} from "./profile.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const stage = path.join(root, "build", "ohimesama", "root-stage");
const manifestPath = path.join(root, "dist", "ohimesama", "root", "manifest.json");

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

console.log("mikuOS お姫様 base-image invariants: OK");
console.log(`paths: ${manifest.entries.length}`);
console.log(`packed root payload: ${manifest.core.packedSize} bytes`);
console.log("runtime payload: none");
console.log("interactive shell: none");
