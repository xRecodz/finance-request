import { statusTone } from "@/lib/format";

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`badge ${statusTone(status)}`}>{label}</span>;
}
