/** Helper kode kategori outlet — dipakai API & sync. */
export function outletCode(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return `OUT_${slug || "UNKNOWN"}`;
}
