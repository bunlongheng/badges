// Read a drop's DataTransfer, recursing into any dropped folders via the webkit
// entries API, so you can drop a whole folder of images at once (not just files).
//
// IMPORTANT: webkitGetAsEntry() must be called synchronously, before any await -
// the DataTransferItemList is emptied once the drop event handler returns.
export async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const entries: FileSystemEntry[] = [];
  const items = dt.items;
  if (items && items.length) {
    for (const it of Array.from(items)) {
      if (it.kind !== "file") continue;
      const entry = it.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
  }
  // No entries API (or nothing captured) - fall back to the flat file list.
  if (!entries.length) return Array.from(dt.files ?? []);

  const out: File[] = [];
  await Promise.all(entries.map((e) => walkEntry(e, out)));
  return expandZips(out);
}

const isZip = (f: File) =>
  /application\/(x-)?zip/i.test(f.type) || /\.zip$/i.test(f.name);

const IMG_RE = /\.(png|jpe?g|gif|webp|bmp|avif|hei[cf])$/i;
const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
};

/** Replace any dropped .zip with the image files inside it (folders included). */
export async function expandZips(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    if (!isZip(f)) {
      out.push(f);
      continue;
    }
    try {
      const { unzipSync } = await import("fflate");
      const buf = new Uint8Array(await f.arrayBuffer());
      const entries = unzipSync(buf, {
        filter: (file) => IMG_RE.test(file.name) && !file.name.includes("__MACOSX/"),
      });
      for (const [path, data] of Object.entries(entries)) {
        if (!data.length) continue; // directory entry
        const base = path.split("/").pop() || path;
        const ext = base.split(".").pop()?.toLowerCase() ?? "";
        const bytes = new Uint8Array(data);
        out.push(new File([bytes], base, { type: MIME[ext] ?? "image/*" }));
      }
    } catch (err) {
      console.error("[badges] unzip failed:", f.name, err);
    }
  }
  return out;
}

function walkEntry(entry: FileSystemEntry, out: File[]): Promise<void> {
  return new Promise((resolve) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file(
        (f) => {
          out.push(f);
          resolve();
        },
        () => resolve()
      );
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const children: FileSystemEntry[] = [];
      // readEntries returns in chunks - keep calling until it returns empty.
      const readBatch = () => {
        reader.readEntries(
          (batch) => {
            if (batch.length === 0) {
              Promise.all(children.map((c) => walkEntry(c, out))).then(() => resolve());
            } else {
              children.push(...batch);
              readBatch();
            }
          },
          () => resolve()
        );
      };
      readBatch();
    } else {
      resolve();
    }
  });
}
