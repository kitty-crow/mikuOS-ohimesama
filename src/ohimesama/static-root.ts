import { fileSum } from "../fs/tree.js";
import type { Tree, TreeEnt } from "../fs/tree.js";
import type { RegSource } from "../fs/vfs.js";
import type {
  WebRootEntry,
  WebRootFileEntry,
  WebRootManifest,
} from "../main/webroot-format.js";

const fromHex = (value: string): Uint8Array => {
  if (value.length % 2 || /[^0-9a-f]/i.test(value)) {
    throw new Error("bad static-root prefix");
  }

  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
};

const fetchOk = async (url: URL): Promise<Response> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url.pathname}: HTTP ${response.status}`);
  return response;
};

const inflate = async (url: URL): Promise<Uint8Array> => {
  const response = await fetchOk(url);
  if (!response.body) throw new Error(`${url.pathname}: empty compressed response`);

  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

/** Immutable static root loader for mikuOS お姫様 browser/Worker hosts. */
export class OhimesamaStaticRoot implements Tree {
  readonly label = "mikuOS お姫様 immutable root";
  private readonly manifestUrl: URL;
  private image = 0;

  constructor(base: URL) {
    this.manifestUrl = new URL("manifest.json", base);
  }

  get imageVersion(): number { return this.image; }

  async pull(): Promise<TreeEnt[]> {
    const manifest = await (await fetchOk(this.manifestUrl)).json() as WebRootManifest;
    if (manifest.format !== 1 || !Array.isArray(manifest.entries)) {
      throw new Error("unsupported mikuOS お姫様 root manifest");
    }

    const core = await inflate(new URL(manifest.core.path, this.manifestUrl));
    if (core.length !== manifest.core.unpackedSize) {
      throw new Error("mikuOS お姫様 root core size mismatch");
    }

    this.image = manifest.image;
    return manifest.entries.map(entry => this.entry(entry, core));
  }

  async push(_entries: TreeEnt[], _imageVersion?: number): Promise<void> {
    throw new Error("mikuOS お姫様 base root is immutable");
  }

  private entry(entry: WebRootEntry, core: Uint8Array): TreeEnt {
    if (entry.k === "d" || entry.k === "l") return { ...entry };

    const file = entry as WebRootFileEntry;
    if (file.ref.kind === "core") {
      const data = core.slice(file.ref.offset, file.ref.offset + file.ref.length);
      if (data.length !== file.size || fileSum(data) !== file.sum) {
        throw new Error(`bad mikuOS お姫様 root entry ${file.p}`);
      }
      return { ...file, data, size: file.size, sum: file.sum };
    }

    const url = new URL(file.ref.path, this.manifestUrl);
    const source: RegSource = {
      size: file.size,
      sum: file.sum,
      head: fromHex(file.head),
      load: async () => {
        const data = await inflate(url);
        if (data.length !== file.size || fileSum(data) !== file.sum) {
          throw new Error(`bad mikuOS お姫様 root blob ${file.p}`);
        }
        return data;
      },
    };

    return { ...file, source, size: file.size, sum: file.sum };
  }
}
