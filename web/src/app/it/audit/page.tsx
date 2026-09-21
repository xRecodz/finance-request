"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Entry = { id: string; action: string; entity: string; entityId: string | null; detail: string | null; createdAt: string; actor: { nip: string; name: string } | null };

export default function ItAuditPage() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => { void api<{ data: Entry[] }>(`/api/settings/audit?page=${page}`).then(result => setRows(result.data)).catch(err => setError(err instanceof ApiError ? err.message : "Gagal memuat audit")); }, [page]);
  return <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-6"><div><h1 className="text-2xl font-bold text-sli-ink">Audit Aktivitas</h1><p className="text-sm text-sli-muted">Riwayat login, pengajuan, perubahan user dan routing.</p></div>{error && <p className="rounded-xl bg-sli-red-soft p-3 text-sm text-sli-red">{error}</p>}<div className="space-y-2">{rows.map(row => <article key={row.id} className="panel rounded-xl p-3 text-sm"><div className="flex flex-wrap justify-between gap-1"><strong>{row.action}</strong><time className="text-sli-muted">{new Date(row.createdAt).toLocaleString("id-ID")}</time></div><p className="mt-1">{row.actor?.name || "Sistem"} {row.actor?.nip ? `(${row.actor.nip})` : ""} · {row.entity}</p>{row.detail && <p className="mt-1 break-words text-sli-muted">{row.detail}</p>}</article>)}{rows.length === 0 && <p className="text-sm text-sli-muted">Belum ada aktivitas di halaman ini.</p>}</div><div className="flex gap-2"><button className="btn-ghost rounded-xl px-3 py-2 text-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</button><button className="btn-ghost rounded-xl px-3 py-2 text-sm" disabled={rows.length < 30} onClick={() => setPage(page + 1)}>Berikutnya</button></div></div>;
}
