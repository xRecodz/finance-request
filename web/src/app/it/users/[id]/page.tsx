"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { ApproverTrack, CategoryOption, ManagedUser, UserRole } from "@/lib/types";

type FormState = {
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  businessRole: string;
  workLocation: string;
  homeOutletId: string;
  onboardingComplete: boolean;
  role: Exclude<UserRole, "ADMIN"> | "ADMIN";
  approverTrack: ApproverTrack | "";
  isActive: boolean;
};

export default function ItEditUserPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [outlets, setOutlets] = useState<CategoryOption[]>([]);

  useEffect(() => { void api<{ data: CategoryOption[] }>("/api/meta/categories?kind=OUTLET").then(result => setOutlets(result.data)).catch(() => {}); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api<{ data: ManagedUser }>(`/api/users/${params.id}`);
        if (cancelled) return;
        setUser(res.data);
        setForm({
          name: res.data.name,
          email: res.data.email || "",
          phone: res.data.phone || "",
          position: res.data.position || "",
          department: res.data.department || "",
          businessRole: res.data.businessRole || "",
          workLocation: res.data.workLocation || "",
          homeOutletId: res.data.homeOutletId || "",
          onboardingComplete: res.data.onboardingComplete || false,
          role: res.data.role,
          approverTrack: res.data.approverTrack || "",
          isActive: res.data.isActive,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat user");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !user) return;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        position: form.position.trim() || null,
        department: form.department.trim() || null,
        businessRole: form.businessRole || null,
        workLocation: form.workLocation || null,
        homeOutletId: form.workLocation === "OUTLET" ? form.homeOutletId || null : null,
        onboardingComplete: form.onboardingComplete,
        isActive: form.isActive,
      };
      if (user.role !== "ADMIN") {
        body.role = form.role;
        body.approverTrack = form.role === "APPROVER" ? form.approverTrack || null : null;
      }
      const res = await api<{ data: ManagedUser }>(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setUser(res.data);
      setMessage("Perubahan disimpan. Password tidak diubah.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword() {
    if (!user) return;
    if (!window.confirm(`Reset password ${user.name} ke default sistem?`)) return;
    setError("");
    setMessage("");
    setResetting(true);
    try {
      const res = await api<{ data: ManagedUser; message?: string }>(
        `/api/users/${user.id}/reset-password`,
        { method: "POST" }
      );
      setUser(res.data);
      setMessage(res.message || "Password direset ke default sistem.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal reset password");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return <div className="px-4 py-10 text-center text-sli-muted">Memuat...</div>;
  }

  if (!user || !form) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <Link href="/it" className="text-sm font-semibold text-sli-red hover:underline">
          ← Kembali
        </Link>
        <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">
          {error || "User tidak ditemukan"}
        </div>

      </div>
    );
  }

  const isAdminTarget = user.role === "ADMIN";

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-6">
      <div>
        <Link href="/it" className="text-sm font-semibold text-sli-red hover:underline">
          ← Kembali
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-sli-ink">{user.name}</h1>
        <p className="mt-1 font-mono text-sm text-sli-muted">{user.nip}</p>
      </div>

      <form onSubmit={onSubmit} className="panel space-y-4 rounded-2xl p-5 md:p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Nama *</span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            required
            disabled={isAdminTarget}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Email</span>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              disabled={isAdminTarget}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Telepon</span>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              disabled={isAdminTarget}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Jabatan</span>
            <input
              className="input"
              value={form.position}
              onChange={(e) => setField("position", e.target.value)}
              disabled={isAdminTarget}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Departemen</span>
            <input
              className="input"
              value={form.department}
              onChange={(e) => setField("department", e.target.value)}
              disabled={isAdminTarget}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Role</span>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setField("role", e.target.value as FormState["role"])}
              disabled={isAdminTarget}
            >
              <option value="PEMOHON">Pemohon</option>
              <option value="APPROVER">Approver</option>
              <option value="MANAGER">Manager</option>
              <option value="IT">IT</option>
              {isAdminTarget ? <option value="ADMIN">Admin</option> : null}
            </select>
          </label>
          {form.role === "APPROVER" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Jalur approval</span>
              <select
                className="input"
                value={form.approverTrack}
                onChange={(e) => setField("approverTrack", e.target.value as ApproverTrack | "")}
                required
                disabled={isAdminTarget}
              >
                <option value="">Pilih jalur</option>
                <option value="DIREKTUR">Sekretariat</option>
                <option value="FINANCE">Finance</option>
              </select>
            </label>
          ) : (
            <div />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-semibold">Divisi pengajuan</span><select className="input" value={form.businessRole} onChange={e => setField("businessRole", e.target.value)} disabled={isAdminTarget}><option value="">Belum dipilih</option>{["MARKETING", "GA", "HRD", "IT", "ACCOUNTING", "AUDIT", "FINANCE", "IC", "OPERASIONAL"].map(role => <option key={role}>{role}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold">Penempatan</span><select className="input" value={form.workLocation} onChange={e => setField("workLocation", e.target.value)} disabled={isAdminTarget}><option value="">Belum dipilih</option><option value="HO">Head Office</option><option value="OUTLET">Outlet</option></select></label>
          {form.workLocation === "OUTLET" && <label className="block"><span className="mb-1.5 block text-sm font-semibold">Outlet karyawan</span><select className="input" value={form.homeOutletId} onChange={e => setField("homeOutletId", e.target.value)} disabled={isAdminTarget}><option value="">Pilih outlet</option>{outlets.map(outlet => <option value={outlet.id} key={outlet.id}>{outlet.name}</option>)}</select></label>}
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.onboardingComplete} onChange={e => setField("onboardingComplete", e.target.checked)} disabled={isAdminTarget} />Profil awal selesai</label>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setField("isActive", e.target.checked)}
            disabled={isAdminTarget}
          />
          Akun aktif (nonaktif = tidak bisa login)
        </label>

        {isAdminTarget ? (
          <p className="text-sm text-sli-muted">Akun ADMIN tidak bisa diubah dari portal IT.</p>
        ) : null}

        {error ? (
          <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div>
        ) : null}
        {message ? (
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>
        ) : null}

        {!isAdminTarget ? (
          <button type="submit" disabled={saving} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        ) : null}
      </form>

      {!isAdminTarget ? (
        <div className="panel space-y-3 rounded-2xl p-5 md:p-6">
          <h2 className="text-lg font-bold text-sli-ink">Reset password</h2>
          <p className="text-sm text-sli-muted">
            Mengembalikan password ke default sistem dan mewajibkan ganti saat login berikutnya. Tidak mengubah
            data pengajuan.
          </p>
          <button
            type="button"
            disabled={resetting}
            onClick={() => void onResetPassword()}
            className="rounded-xl border border-sli-red/30 bg-sli-red-soft px-4 py-2.5 text-sm font-semibold text-sli-red"
          >
            {resetting ? "Mereset..." : "Reset Password"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
