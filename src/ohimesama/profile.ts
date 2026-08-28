export const OHIMESAMA_PROFILE_VERSION = 1;

export type RootKind = "d" | "f" | "l";

export interface RootRow {
  p: string;
  k: RootKind;
  id: number;
  mode: number;
  uid: number;
  gid: number;
  at: number;
  mt: number;
  ct: number;
  to?: string;
}

/**
 * mikuOS お姫様 is deliberately application-agnostic. The base image contains
 * only the filesystem skeleton and identity material required to host a future
 * service runtime. Runtime- and application-specific files are layered above
 * this profile later.
 */
export const OHIMESAMA_BASE_PATHS = new Set<string>([
  "/",
  "/dev",
  "/etc",
  "/etc/group",
  "/etc/os-release",
  "/etc/passwd",
  "/lib",
  "/proc",
  "/run",
  "/srv",
  "/tmp",
  "/usr",
  "/usr/bin",
  "/usr/lib",
  "/var",
  "/var/tmp",
]);

export const OHIMESAMA_REQUIRED_PATHS = [
  "/",
  "/etc",
  "/etc/passwd",
  "/etc/group",
  "/run",
  "/srv",
  "/tmp",
  "/usr",
  "/usr/bin",
  "/usr/lib",
  "/var",
] as const;

export const OHIMESAMA_FORBIDDEN_PREFIXES = [
  "/bin/",
  "/boot/",
  "/home/",
  "/root/",
  "/sbin/",
  "/usr/include/",
  "/usr/libexec/",
  "/usr/share/",
] as const;

export const keepOhimesamaBasePath = (path: string): boolean =>
  OHIMESAMA_BASE_PATHS.has(path);

export const OHIMESAMA_PASSWD = [
  "root:x:0:0:root:/:/sbin/nologin",
  "service:x:1000:1000:service:/srv:/sbin/nologin",
  "",
].join("\n");

export const OHIMESAMA_GROUP = [
  "root:x:0:",
  "service:x:1000:",
  "",
].join("\n");

export const OHIMESAMA_OS_RELEASE = [
  'NAME="mikuOS お姫様"',
  'ID="mikuos-ohimesama"',
  'ID_LIKE="mikuos"',
  'VARIANT="Headless appliance"',
  'VARIANT_ID="ohimesama"',
  "",
].join("\n");
