export function formatRupiah(value: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
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
  return track === "DIREKTUR" ? "Direktur" : "Finance";
}

export function statusTone(status: string): string {
  switch (status) {
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
