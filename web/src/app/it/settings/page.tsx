"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { CategoryOption } from "@/lib/types";
import { PasswordInput } from "@/components/PasswordInput";

type Person = { id: string; nip: string; name: string; isActive: boolean } | null;
type ManagerRoute = { businessRole: string; manager: Person; configured: boolean };
type PayoutRoute = { track: string; destination: string; officer: Person; configured: boolean };
type Data = { managerRoutes: ManagerRoute[]; payoutRoutes: PayoutRoute[]; outletOverrides: Array<{ id: string; businessRole: string; outletCategoryId: string; manager: Person; isActive: boolean }>; defaultPasswordConfigured: boolean };
type RequestPreview = { number: string; title: string; status: string; manager: Person; disbursementOfficer: Person; approver: Person };

export default function ItSettingsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [outlets, setOutlets] = useState<CategoryOption[]>([]);
  const [role, setRole] = useState("OPERASIONAL");
  const [outletId, setOutletId] = useState("");
  const [managerNip, setManagerNip] = useState("");
  const [password, setPassword] = useState("");
  const [requestNumber, setRequestNumber] = useState("");
  const [requestPreview, setRequestPreview] = useState<RequestPreview | null>(null);
  const [target, setTarget] = useState<"manager" | "officer">("manager");
  const [targetNip, setTargetNip] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [settings, categories] = await Promise.all([
        api<{ data: Data }>("/api/settings"),
        api<{ data: CategoryOption[] }>("/api/meta/categories?kind=OUTLET"),
      ]);
      setData(settings.data);
      setOutlets(categories.data);
    } catch (err) { setError(err instanceof ApiError ? err.message : "Gagal memuat pengaturan"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save(path: string, body: unknown, key: string) {
    setBusy(key); setError(""); setNotice("");
    try {
      const result = await api<{ message: string }>(path, { method: "PUT", body: JSON.stringify(body) });
      setNotice(result.message);
      await load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Gagal menyimpan"); }
    finally { setBusy(""); }
  }

  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
    <div><h1 className="text-2xl font-bold text-sli-ink">Routing & Password</h1><p className="mt-1 text-sm text-sli-muted">Atur manager berdasarkan divisi dan petugas pencairan berdasarkan jalur serta tujuan. NIP yang dipilih harus aktif.</p></div>
    {error && <p className="rounded-xl bg-sli-red-soft p-3 text-sm text-sli-red">{error}</p>}
    {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Manager per divisi</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data?.managerRoutes.map(row => <form key={row.businessRole} className="rounded-xl border border-sli-line p-3" onSubmit={event => { event.preventDefault(); const input = event.currentTarget.elements.namedItem("nip") as HTMLInputElement; void save("/api/settings/manager-route", { businessRole: row.businessRole, managerNip: input.value.trim() }, row.businessRole); }}><label className="text-sm font-semibold">{row.businessRole}</label><p className="mb-2 text-xs text-sli-muted">{row.manager ? `${row.manager.name} · ${row.manager.nip}` : "Belum diatur"}</p><div className="flex gap-2"><input name="nip" defaultValue={row.manager?.nip || ""} className="input min-w-0 flex-1" aria-label={`NIP manager ${row.businessRole}`} required /><button disabled={Boolean(busy)} className="btn-primary rounded-lg px-3 text-sm">Simpan</button></div></form>)}</div></section>
    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Manager khusus outlet</h2><p className="text-sm text-sli-muted">Jika diisi, aturan ini menggantikan manager divisi umum untuk karyawan outlet tersebut.</p><form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={event => { event.preventDefault(); void save("/api/settings/manager-route", { businessRole: role, outletCategoryId: outletId, managerNip: managerNip.trim() }, "outlet"); }}><select className="input" value={role} onChange={event => setRole(event.target.value)}>{data?.managerRoutes.map(row => <option key={row.businessRole}>{row.businessRole}</option>)}</select><select className="input" value={outletId} onChange={event => setOutletId(event.target.value)} required><option value="">Pilih outlet</option>{outlets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input className="input" value={managerNip} onChange={event => setManagerNip(event.target.value)} placeholder="NIP manager" required /><button className="btn-primary rounded-xl px-4" disabled={Boolean(busy)}>Simpan</button></form><div className="mt-3 space-y-1 text-xs text-sli-muted">{data?.outletOverrides.filter(row => row.isActive).map(row => <p key={row.id}>{row.businessRole} · {outlets.find(outlet => outlet.id === row.outletCategoryId)?.name || row.outletCategoryId} → {row.manager?.name || "—"}</p>)}</div></section>
    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Petugas pencairan</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{data?.payoutRoutes.map(row => <form key={`${row.track}:${row.destination}`} className="rounded-xl border border-sli-line p-3" onSubmit={event => { event.preventDefault(); const input = event.currentTarget.elements.namedItem("nip") as HTMLInputElement; void save("/api/settings/payout-route", { track: row.track, destination: row.destination, officerNip: input.value.trim() }, `${row.track}:${row.destination}`); }}><label className="text-sm font-semibold">{row.track === "DIREKTUR" ? "Sekretariat" : "Finance"} → {row.destination === "HO" ? "Head Office" : "Outlet"}</label><p className="mb-2 text-xs text-sli-muted">{row.officer ? `${row.officer.name} · ${row.officer.nip}` : "Belum diatur"}</p><div className="flex gap-2"><input name="nip" defaultValue={row.officer?.nip || ""} className="input min-w-0 flex-1" aria-label="NIP petugas pencairan" required /><button disabled={Boolean(busy)} className="btn-primary rounded-lg px-3 text-sm">Simpan</button></div></form>)}</div></section>
    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Perbaiki penugasan pengajuan</h2><p className="mt-1 text-sm text-sli-muted">Cari nomor pengajuan, periksa status dan petugas saat ini, lalu tulis NIP tujuan serta alasan. Hanya tugas yang masih menunggu dapat dialihkan.</p><form className="mt-4 flex flex-wrap gap-2" onSubmit={async event => { event.preventDefault(); setError(""); setRequestPreview(null); try { const result = await api<{ data: RequestPreview }>(`/api/settings/request-preview?number=${encodeURIComponent(requestNumber.trim())}`); setRequestPreview(result.data); } catch (err) { setError(err instanceof ApiError ? err.message : "Pengajuan tidak ditemukan"); } }}><input className="input min-w-[230px] flex-1" value={requestNumber} onChange={event => setRequestNumber(event.target.value)} placeholder="Nomor pengajuan lengkap" required /><button className="btn-ghost rounded-xl px-4">Cari</button></form>{requestPreview && <div className="mt-4 space-y-3 rounded-xl border border-sli-line p-4 text-sm"><p className="font-semibold">{requestPreview.number} · {requestPreview.title}</p><p>Status: {requestPreview.status}</p><p>Manager saat ini: {requestPreview.manager?.name || "—"} · Petugas pencairan: {requestPreview.disbursementOfficer?.name || requestPreview.approver?.name || "—"}</p><form className="grid gap-3 md:grid-cols-4" onSubmit={event => { event.preventDefault(); if (window.confirm(`Alihkan ${target === "manager" ? "manager" : "petugas pencairan"} untuk ${requestPreview.number} ke NIP ${targetNip}?`)) void save("/api/settings/reroute-request", { number: requestPreview.number, target, nip: targetNip.trim(), reason: reason.trim() }, "reroute").then(() => setRequestPreview(null)); }}><select className="input" value={target} onChange={event => setTarget(event.target.value as "manager" | "officer")}><option value="manager">Manager</option><option value="officer">Petugas pencairan</option></select><input className="input" value={targetNip} onChange={event => setTargetNip(event.target.value)} placeholder="NIP tujuan" required /><input className="input" value={reason} onChange={event => setReason(event.target.value)} placeholder="Alasan, minimal 5 karakter" minLength={5} required /><button className="btn-primary rounded-xl px-4" disabled={Boolean(busy)}>Alihkan tugas</button></form></div>}</section>
    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Password default</h2><p className="mt-1 text-sm text-sli-muted">Berlaku untuk akun baru dan reset selanjutnya. Akun yang sudah login tidak berubah. Nilai tersimpan sebagai hash dan tidak dapat ditampilkan ulang.</p><form className="mt-4 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void save("/api/settings/default-password", { password }, "password"); setPassword(""); }}><div className="min-w-[220px] flex-1"><PasswordInput className="input" value={password} onChange={event => setPassword(event.target.value)} minLength={6} placeholder="Password baru, minimal 6 karakter" required /></div><button disabled={Boolean(busy)} className="btn-primary rounded-xl px-4">Ubah Password Default</button></form></section>
  </div>;
}
