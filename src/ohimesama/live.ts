import { bad } from "../core/err.js";
import type { Kern } from "../core/kernel.js";
import type { Cred } from "../fs/vfs.js";

const root: Cred = {
  uid: 0,
  gid: 0,
  ruid: 0,
  euid: 0,
  suid: 0,
  rgid: 0,
  egid: 0,
  sgid: 0,
  groups: [0],
};

const random = (length: number): Uint8Array => {
  const output = new Uint8Array(length);

  for (let at = 0; at < output.length; at += 65536) {
    crypto.getRandomValues(output.subarray(at, Math.min(at + 65536, output.length)));
  }

  return output;
};

/**
 * Install only the conventional character devices expected by generic native
 * runtimes. There is intentionally no console, TTY or interactive device.
 */
export const liveOhimesama = (k: Kern): void => {
  k.fs.char("/dev/null", () => new Uint8Array(), bytes => bytes.length, "/", root);
  k.fs.char("/dev/zero", length => new Uint8Array(length), bytes => bytes.length, "/", root, 0o666, true);
  k.fs.char("/dev/random", random, bytes => bytes.length, "/", root, 0o444, true);
  k.fs.char("/dev/urandom", random, bytes => bytes.length, "/", root, 0o444, true);
  k.fs.char(
    "/dev/full",
    () => new Uint8Array(),
    () => bad("ENOSPC", "/dev/full"),
    "/",
    root,
  );

  k.log("ohimesama: minimal devfs ready");
};
