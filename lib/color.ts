/**
 * Pick a photo's primary colour for the "Auto" border. Downscales to a tiny
 * canvas and averages the pixels, weighting vivid (saturated) pixels heavily so
 * the result lands on the dominant colour instead of a muddy grey/white average.
 */
export async function dominantColor(url: string): Promise<string | undefined> {
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = url;
  });
  if (!img) return undefined;

  const N = 32;
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.drawImage(img, 0, 0, N, N);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, N, N).data;
  } catch {
    return undefined; // tainted canvas (shouldn't happen for same-origin blob URLs)
  }

  let r = 0, g = 0, b = 0, wsum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i], G = data[i + 1], B = data[i + 2], A = data[i + 3];
    if (A < 128) continue;
    const max = Math.max(R, G, B);
    const min = Math.min(R, G, B);
    const sat = max === 0 ? 0 : (max - min) / max; // 0..1 colourfulness
    const w = sat * sat + 0.02; // vivid pixels dominate; tiny base keeps grey photos sane
    r += R * w;
    g += G * w;
    b += B * w;
    wsum += w;
  }
  if (wsum === 0) return undefined;

  const hex = (v: number) => Math.round(v / wsum).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
