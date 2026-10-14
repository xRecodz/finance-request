export function formatRupiah(value: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

/** Tampilkan angka untuk input (pemisah ribuan titik, desimal koma). */
export function formatLocaleInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);
}

/**
 * Parse angka gaya Indonesia: titik = ribuan, koma = desimal.
 * Contoh: "1.020.003" → 1020003, "1.020.003,5" → 1020003.5, "1,5" → 1.5
 * Juga menerima titik desimal Barat jika tidak ada koma ("1.5" → 1.5).
 */
export function parseLocaleNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (value == null) return NaN;
  const cleaned = String(value).trim().replace(/\s/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "," || cleaned === ".") return NaN;

  if (cleaned.includes(",")) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    return Number(normalized);
  }

  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return Number(parts.join(""));
  }
  // Satu titik + tepat 3 digit di belakang → pemisah ribuan (1.000 → 1000)
  if (
    parts.length === 2 &&
    parts[0] !== "" &&
    parts[1].length === 3 &&
    /^\d+$/.test(parts[0].replace(/^-/, "")) &&
    /^\d+$/.test(parts[1])
  ) {
    return Number(parts[0] + parts[1]);
  }
  return Number(cleaned);
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function trackLabel(track: string): string {
  return track === "DIREKTUR" ? "Sekretariat" : "Finance";
}

export function typeLabel(type: string): string {
  switch (type) {
    case "BARANG":
      return "Barang";
    case "REIMBURSEMENT":
      return "Reimbursement";
    default:
      return "Dana";
  }
}

export function statusTone(status: string): string {
  switch (status) {
    case "MENUNGGU_MANAGER":
    case "MENUNGGU_APPROVAL":
    case "LPJ_MENUNGGU":
      return "badge-amber";
    case "DISETUJUI":
    case "DICAIRKAN":
    case "SELESAI":
      return "badge-green";
    case "DITOLAK":
    case "LPJ_DITOLAK":
    case "DIBATALKAN":
      return "badge-red";
    case "REVISI":
      return "badge-blue";
    default:
      return "badge-muted";
  }
}
