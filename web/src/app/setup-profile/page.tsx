"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { pathForPortal, type Portal, type CategoryOption } from "@/lib/types";

const ROLES = [
  ["MARKETING", "Marketing"], ["IT", "IT"], ["ACCOUNTING", "Accounting"],
  ["AUDIT", "Audit"], ["GA", "GA"], ["HRD", "HRD"],
  ["FINANCE", "Finance"], ["IC", "IC"], ["OPERASIONAL", "Operasional"],
] as const;

export default function SetupProfilePage() {
  const { user, loading, setupProfile } = useAuth();
  const router = useRouter();
  const [businessRole, setBusinessRole] = useState(user?.businessRole || "");
  const [workLocation, setWorkLocation] = useState<"HO" | "OUTLET">((user?.workLocation as "HO" | "OUTLET") || "HO");
  const [homeOutletId, setHomeOutletId] = useState(user?.homeOutletId || "");
  const [outlets, setOutlets] = useState<CategoryOption[]>([]);
  const [manager, setManager] = useState<string>("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
    else if (user?.mustChangePassword) router.replace("/change-password");
    void api<{ data: CategoryOption[] }>("/api/meta/categories?kind=OUTLET")
      .then((res) => setOutlets(res.data)).catch(() => {});
  }, [loading, user, router]);

  useEffect(() => {
    if (!businessRole) { setManager(""); return; }
    const params = new URLSearchParams({ role: businessRole });
    if (workLocation === "OUTLET" && homeOutletId) params.set("outletId", homeOutletId);
    void api<{ data: { name: string } | null; message?: string }>(`/api/meta/manager-preview?${params}`)
      .then((res) => setManager(res.data?.name || res.message || "Manager belum diatur"))
      .catch(() => setManager("Manager belum diatur"));
  }, [businessRole, workLocation, homeOutletId]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      const updated = await setupProfile(businessRole, workLocation, workLocation === "OUTLET" ? homeOutletId : null);
      const portal = (sessionStorage.getItem("sli_post_login_portal") || "PEMOHON") as Portal;
      router.replace(pathForPortal(portal, updated.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan penempatan");
    } finally { setSaving(false); }
  }

  if (loading || !user) return <div className="p-8 text-center">Memuat...</div>;

  return <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
    <form onSubmit={submit} className="panel w-full space-y-5 rounded-3xl p-6 md:p-8">
      <div><p className="brand-mark text-2xl font-bold text-sli-red">SL INDONESIA</p>
        <h1 className="mt-3 text-2xl font-bold">Pilih divisi dan penempatan</h1>
        <p className="mt-1 text-sm text-sli-muted">Pilihan ini menentukan manager untuk pengajuan Anda. Hak Approval dan Portal IT tetap diatur admin.</p></div>
      <label className="block"><span className="mb-1 block text-sm font-semibold">Divisi / role organisasi</span>
        <select className="input" value={businessRole} onChange={(e) => setBusinessRole(e.target.value)} required>
          <option value="">Pilih divisi</option>{ROLES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">Penempatan asal</span>
        <select className="input" value={workLocation} onChange={(e) => {setWorkLocation(e.target.value as "HO" | "OUTLET"); setHomeOutletId("");}}>
          <option value="HO">Head Office</option><option value="OUTLET">Outlet</option>
        </select></label>
      {workLocation === "OUTLET" ? <label className="block"><span className="mb-1 block text-sm font-semibold">Outlet asal</span>
        <select className="input" value={homeOutletId} onChange={(e) => setHomeOutletId(e.target.value)} required>
          <option value="">Pilih outlet</option>{outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select></label> : null}
      <div className="rounded-xl border border-sli-line bg-white px-4 py-3 text-sm"><span className="text-sli-muted">Manager tujuan: </span><strong>{manager || "Pilih divisi dahulu"}</strong></div>
      {error ? <p className="rounded-xl bg-sli-red-soft p-3 text-sm text-sli-red">{error}</p> : null}
      <button disabled={saving} className="btn-primary w-full rounded-xl px-4 py-3 font-semibold">{saving ? "Menyimpan..." : "Konfirmasi Penempatan"}</button>
    </form>
  </main>;
}
