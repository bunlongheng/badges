/**
 * Derive a display name from a photo's filename for the curved bottom label.
 * Drops the extension and any leading rank prefix ("03-"), turns separators into
 * spaces, and title-cases: "03-argentina.png" -> "Argentina", "gb_eng.jpg" -> "Gb Eng".
 */
export function extractName(filename: string): string {
  const base = filename.replace(/\.[^./\\]+$/, ""); // drop extension
  const noRank = base.replace(/^\s*\d+\s*[-_.]\s*/, ""); // drop leading "03-"
  return noRank
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
