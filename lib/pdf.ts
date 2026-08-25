/**
 * Export the rendered .sheet nodes to a multi-page PDF.
 * We rasterize each sheet with html2canvas (kept at ~240 DPI) and place it on a
 * PDF page sized to the exact paper dimensions. Sheets use inline hex styles
 * (no oklch), so html2canvas parses them cleanly.
 */
export async function exportPdf(
  root: HTMLElement,
  paper: { w: number; h: number },
  filename = "badges.pdf"
): Promise<void> {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import("jspdf"),
    import("html2canvas").then((m) => m.default),
  ]);

  const sheets = Array.from(root.querySelectorAll<HTMLElement>(".sheet"));
  if (sheets.length === 0) return;

  const pdf = new jsPDF({
    orientation: paper.w > paper.h ? "landscape" : "portrait",
    unit: "in",
    format: [paper.w, paper.h],
  });

  for (let i = 0; i < sheets.length; i++) {
    if (i > 0) pdf.addPage([paper.w, paper.h], paper.w > paper.h ? "landscape" : "portrait");
    const sheet = sheets[i];
    // Capture at true paper size: neutralize the on-screen preview transform.
    const prevTransform = sheet.style.transform;
    sheet.style.transform = "none";
    const canvas = await html2canvas(sheet, {
      scale: 2.5,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    sheet.style.transform = prevTransform;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(imgData, "JPEG", 0, 0, paper.w, paper.h);
  }

  pdf.save(filename);
}
