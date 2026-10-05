"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";

type Person = { id: string; nip: string; name: string; isActive: boolean } | null;
type BusinessRole = { id: string; code: string; name: string; supervisorLabel: string; defaultTrack: "DIREKTUR" | "FINANCE"; defaultDestination: "HO" | "OUTLET"; isActive: boolean; sortOrder: number };
type Category = { id: string; code: string; name: string; description?: string | null; kind: "STANDARD" | "OUTLET"; isActive: boolean; sortOrder: number };
type ManagerRoute = BusinessRole & { businessRole: string; manager: Person; configured: boolean };
type PayoutRoute = { track: string; destination: string; officer: Person; configured: boolean };
type Data = { businessRoles: BusinessRole[]; categories: Category[]; managerRoutes: ManagerRoute[]; payoutRoutes: PayoutRoute[]; defaultPasswordConfigured: boolean };
type RequestPreview = { number: string; title: string; status: string; manager: Person; disbursementOfficer: Person; approver: Person };

type NewRole = { code: string; name: string; supervisorLabel: string; defaultTrack: "DIREKTUR" | "FINANCE"; defaultDestination: "HO" | "OUTLET"; sortOrder: number };
const defaultRole: NewRole = { code: "", name: "", supervisorLabel: "Manager", defaultTrack: "FINANCE", defaultDestination: "HO", sortOrder: 500 };
type NewCategory = { code: string; name: string; description: string; kind: "STANDARD" | "OUTLET"; sortOrder: number };
const defaultCategory: NewCategory = { code: "", name: "", description: "", kind: "STANDARD", sortOrder: 500 };

export default function ItSettingsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [newRole, setNewRole] = useState(defaultRole);
  const [newCategory, setNewCategory] = useState(defaultCategory);
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
      const result = await api<{ data: Data }>("/api/settings");
      setData(result.data);
      if (!result.data.businessRoles.some((item) => item.code === role)) setRole(result.data.businessRoles[0]?.code || "");
    } catch (err) { setError(err instanceof ApiError ? err.message : "Gagal memuat pengaturan"); }
  }, [role]);
  useEffect(() => { void load(); }, [load]);

  async function save(path: string, body: unknown, key: string, method: "POST" | "PUT" | "PATCH" = "PUT") {
    setBusy(key); setError(""); setNotice("");
    try {
      const result = await api<{ message: string }>(path, { method, body: JSON.stringify(body) });
      setNotice(result.message); await load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Gagal menyimpan"); }
    finally { setBusy(""); }
  }

  const outlets = data?.categories.filter((item) => item.kind === "OUTLET" && item.isActive) || [];
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
    <div><h1 className="text-2xl font-bold text-sli-ink">Master Data, Routing & Password</h1><p className="mt-1 text-sm text-sli-muted">Kelola divisi organisasi, kategori, atasan, dan petugas pencairan. Perubahan disimpan ke database.</p></div>
    {error ? <p className="rounded-xl bg-sli-red-soft p-3 text-sm text-sli-red">{error}</p> : null}
    {notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}

    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Divisi organisasi</h2><p className="mt-1 text-sm text-sli-muted">Divisi menentukan label atasan dan pilihan awal jalur pengajuan. Role akses aplikasi tetap diatur pada menu User.</p>
      <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void save("/api/settings/business-roles", newRole, "new-role", "POST").then(() => setNewRole(defaultRole)); }}>
        <input className="input" value={newRole.code} onChange={(e) => setNewRole({ ...newRole, code: e.target.value })} placeholder="Kode, contoh YAYASAN" required />
        <input className="input" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder="Nama divisi" required />
        <input className="input" value={newRole.supervisorLabel} onChange={(e) => setNewRole({ ...newRole, supervisorLabel: e.target.value })} placeholder="Label atasan, contoh Mengetahui" required />
        <select className="input" value={newRole.defaultTrack} onChange={(e) => setNewRole({ ...newRole, defaultTrack: e.target.value as "DIREKTUR" | "FINANCE" })}><option value="FINANCE">Finance</option><option value="DIREKTUR">Sekretariat</option></select>
        <select className="input" value={newRole.defaultDestination} onChange={(e) => setNewRole({ ...newRole, defaultDestination: e.target.value as "HO" | "OUTLET" })}><option value="HO">Head Office</option><option value="OUTLET">Outlet</option></select>
        <button className="btn-primary rounded-xl px-4" disabled={Boolean(busy)}>Tambah divisi</button>
      </form>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data?.businessRoles.map((item) => <form key={item.id} className="rounded-xl border border-sli-line p-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void save(`/api/settings/business-roles/${item.id}`, { name: form.get("name"), supervisorLabel: form.get("supervisorLabel"), defaultTrack: form.get("defaultTrack"), defaultDestination: form.get("defaultDestination"), sortOrder: Number(form.get("sortOrder")), isActive: form.get("isActive") === "on" }, `role-${item.id}`, "PATCH"); }}><p className="text-xs font-semibold text-sli-muted">{item.code}</p><input name="name" className="input mt-2" defaultValue={item.name} required /><input name="supervisorLabel" className="input mt-2" defaultValue={item.supervisorLabel} required /><div className="mt-2 grid grid-cols-2 gap-2"><select name="defaultTrack" className="input" defaultValue={item.defaultTrack}><option value="FINANCE">Finance</option><option value="DIREKTUR">Sekretariat</option></select><select name="defaultDestination" className="input" defaultValue={item.defaultDestination}><option value="HO">Head Office</option><option value="OUTLET">Outlet</option></select></div><div className="mt-2 flex items-center justify-between gap-2 text-xs"><label><input name="isActive" type="checkbox" defaultChecked={item.isActive} /> Aktif</label><input name="sortOrder" className="input !w-20" type="number" min="0" defaultValue={item.sortOrder} /><button className="btn-ghost rounded-lg px-3 py-2 font-semibold" disabled={Boolean(busy)}>Simpan</button></div></form>)}</div>
    </section>

    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Kategori pengajuan</h2><p className="mt-1 text-sm text-sli-muted">Kategori Head Office tampil saat tujuan Head Office. Kategori Outlet tampil saat tujuan Outlet.</p>
      <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void save("/api/settings/categories", newCategory, "new-category", "POST").then(() => setNewCategory(defaultCategory)); }}><input className="input" value={newCategory.code} onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value })} placeholder="Kode kategori" required /><input className="input" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="Nama kategori" required /><select className="input" value={newCategory.kind} onChange={(e) => setNewCategory({ ...newCategory, kind: e.target.value as "STANDARD" | "OUTLET" })}><option value="STANDARD">Head Office</option><option value="OUTLET">Outlet</option></select><input className="input" value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} placeholder="Keterangan (opsional)" /><input className="input" type="number" min="0" value={newCategory.sortOrder} onChange={(e) => setNewCategory({ ...newCategory, sortOrder: Number(e.target.value) })} /><button className="btn-primary rounded-xl px-4" disabled={Boolean(busy)}>Tambah kategori</button></form>
      <div className="mt-4 grid gap-2 md:grid-cols-2">{data?.categories.map((item) => <form key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-sli-line p-3 text-sm" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void save(`/api/settings/categories/${item.id}`, { name: form.get("name"), description: form.get("description"), kind: form.get("kind"), sortOrder: Number(form.get("sortOrder")), isActive: form.get("isActive") === "on" }, `category-${item.id}`, "PATCH"); }}><span className="w-20 font-mono text-xs text-sli-muted">{item.code}</span><input name="name" className="input min-w-32 flex-1" defaultValue={item.name} required /><select name="kind" className="input !w-auto" defaultValue={item.kind}><option value="STANDARD">HO</option><option value="OUTLET">Outlet</option></select><input name="description" className="input min-w-28 flex-1" defaultValue={item.description || ""} placeholder="Keterangan" /><input name="sortOrder" className="input !w-20" type="number" min="0" defaultValue={item.sortOrder} /><label className="text-xs"><input name="isActive" type="checkbox" defaultChecked={item.isActive} /> Aktif</label><button className="btn-ghost rounded-lg px-3 py-2 font-semibold" disabled={Boolean(busy)}>Simpan</button></form>)}</div>
    </section>

    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Atasan per divisi</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data?.managerRoutes.map((item) => <form key={item.businessRole} className="rounded-xl border border-sli-line p-3" onSubmit={(event) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem("nip") as HTMLInputElement; void save("/api/settings/manager-route", { businessRole: item.businessRole, managerNip: input.value.trim() }, item.businessRole); }}><label className="text-sm font-semibold">{item.name} · {item.supervisorLabel}</label><p className="mb-2 text-xs text-sli-muted">{item.manager ? `${item.manager.name} · ${item.manager.nip}` : "Belum diatur"}</p><div className="flex gap-2"><input name="nip" defaultValue={item.manager?.nip || ""} className="input min-w-0 flex-1" required /><button disabled={Boolean(busy)} className="btn-primary rounded-lg px-3 text-sm">Simpan</button></div></form>)}</div></section>

    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Atasan khusus outlet</h2><form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); void save("/api/settings/manager-route", { businessRole: role, outletCategoryId: outletId, managerNip: managerNip.trim() }, "outlet"); }}><select className="input" value={role} onChange={(event) => setRole(event.target.value)}>{data?.businessRoles.filter((item) => item.isActive).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select><select className="input" value={outletId} onChange={(event) => setOutletId(event.target.value)} required><option value="">Pilih outlet</option>{outlets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input className="input" value={managerNip} onChange={(event) => setManagerNip(event.target.value)} placeholder="NIP atasan" required /><button className="btn-primary rounded-xl px-4" disabled={Boolean(busy)}>Simpan</button></form></section>

    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Petugas pencairan</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{data?.payoutRoutes.map((item) => <form key={`${item.track}:${item.destination}`} className="rounded-xl border border-sli-line p-3" onSubmit={(event) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem("nip") as HTMLInputElement; void save("/api/settings/payout-route", { track: item.track, destination: item.destination, officerNip: input.value.trim() }, `${item.track}:${item.destination}`); }}><label className="text-sm font-semibold">{item.track === "DIREKTUR" ? "Sekretariat" : "Finance"} → {item.destination === "HO" ? "Head Office" : "Outlet"}</label><p className="mb-2 text-xs text-sli-muted">{item.officer ? `${item.officer.name} · ${item.officer.nip}` : "Belum diatur"}</p><div className="flex gap-2"><input name="nip" defaultValue={item.officer?.nip || ""} className="input min-w-0 flex-1" required /><button disabled={Boolean(busy)} className="btn-primary rounded-lg px-3 text-sm">Simpan</button></div></form>)}</div></section>

    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Perbaiki penugasan pengajuan</h2><p className="mt-1 text-sm text-sli-muted">Alihkan atasan atau petugas pencairan pada pengajuan yang masih menunggu.</p><form className="mt-4 flex flex-wrap gap-2" onSubmit={async (event) => { event.preventDefault(); setError(""); try { const result = await api<{ data: RequestPreview }>(`/api/settings/request-preview?number=${encodeURIComponent(requestNumber.trim())}`); setRequestPreview(result.data); } catch (err) { setError(err instanceof ApiError ? err.message : "Pengajuan tidak ditemukan"); } }}><input className="input min-w-[230px] flex-1" value={requestNumber} onChange={(event) => setRequestNumber(event.target.value)} placeholder="Nomor pengajuan lengkap" required /><button className="btn-ghost rounded-xl px-4">Cari</button></form>{requestPreview ? <div className="mt-4 space-y-3 rounded-xl border border-sli-line p-4 text-sm"><p className="font-semibold">{requestPreview.number} · {requestPreview.title}</p><p>Status: {requestPreview.status}</p><p>Atasan: {requestPreview.manager?.name || "—"} · Petugas: {requestPreview.disbursementOfficer?.name || requestPreview.approver?.name || "—"}</p><form className="grid gap-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); void save("/api/settings/reroute-request", { number: requestPreview.number, target, nip: targetNip.trim(), reason: reason.trim() }, "reroute").then(() => setRequestPreview(null)); }}><select className="input" value={target} onChange={(event) => setTarget(event.target.value as "manager" | "officer")}><option value="manager">Atasan</option><option value="officer">Petugas pencairan</option></select><input className="input" value={targetNip} onChange={(event) => setTargetNip(event.target.value)} placeholder="NIP tujuan" required /><input className="input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Alasan, minimal 5 karakter" minLength={5} required /><button className="btn-primary rounded-xl px-4" disabled={Boolean(busy)}>Alihkan tugas</button></form></div> : null}</section>

    <section className="panel rounded-2xl p-5"><h2 className="text-lg font-bold">Password default</h2><p className="mt-1 text-sm text-sli-muted">Berlaku untuk akun baru dan reset berikutnya.</p><form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void save("/api/settings/default-password", { password }, "password").then(() => setPassword("")); }}><div className="min-w-[220px] flex-1"><PasswordInput className="input" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} placeholder="Password baru, minimal 6 karakter" required /></div><button disabled={Boolean(busy)} className="btn-primary rounded-xl px-4">Ubah Password Default</button></form></section>
  </div>;
}
