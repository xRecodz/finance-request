"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ManagedUser, UserRole } from "@/lib/types";

const ROLE_LABEL: Record<UserRole, string> = {
  PEMOHON: "Pemohon",
  APPROVER: "Approver",
  MANAGER: "Manager",
  ADMIN: "Admin",
  IT: "IT",
};

export default function ItUsersPage() {
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (appliedQ) params.set("q", appliedQ);
      if (role) params.set("role", role);
      if (active) params.set("isActive", active);
      const res = await api<{
        data: ManagedUser[];
        pagination: { totalPages: number; total: number };
      }>(`/api/users?${params}`);
      setRows(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat user");
    } finally {
      setLoading(false);
    }
  }, [page, appliedQ, role, active]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    if (appliedQ === q.trim() && page === 1) void load();
    else setAppliedQ(q.trim());
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-sli-ink">Kelola User</h1>
          <p className="mt-1 text-sm text-sli-muted">
            Buat akun manual, edit profil, aktif/nonaktif, dan reset password. Password hanya berubah lewat
            tombol Reset.
          </p>
        </div>
        <Link href="/it/users/new" className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">
          Tambah User
        </Link>
      </div>

      <form onSubmit={onSearch} className="panel flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sli-muted">
            Cari NIP / nama
          </span>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Contoh: 1511 atau Budi"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sli-muted">Role</span>
          <select className="input" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">Semua</option>
            <option value="PEMOHON">Pemohon</option>
            <option value="APPROVER">Approver</option>
            <option value="MANAGER">Manager</option>
            <option value="IT">IT</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sli-muted">Status</span>
          <select className="input" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}>
            <option value="">Semua</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </label>
        <button type="submit" className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">
          Cari
        </button>
      </form>

      {error ? (
        <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div>
      ) : null}

      <div className="panel overflow-x-auto rounded-2xl">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-sli-line text-xs uppercase tracking-wide text-sli-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">NIP</th>
              <th className="px-4 py-3 font-semibold">Nama</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Departemen</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sli-muted">
                  Memuat...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sli-muted">
                  Tidak ada user.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-sli-line/70 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{row.nip}</td>
                  <td className="px-4 py-3 font-semibold text-sli-ink">{row.name}</td>
                  <td className="px-4 py-3">
                    {ROLE_LABEL[row.role]}
                    {row.approverTrack ? (
                      <span className="ml-1 text-xs text-sli-muted">
                        ({row.approverTrack === "DIREKTUR" ? "Sekretariat" : "Finance"})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sli-muted">{row.department || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        row.isActive
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
                      }
                    >
                      {row.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/it/users/${row.id}`} className="font-semibold text-sli-red hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-sli-muted">
        <span>
          {total} user · halaman {page}/{totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost rounded-xl px-3 py-1.5 font-semibold disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Sebelumnya
          </button>
          <button
            type="button"
            className="btn-ghost rounded-xl px-3 py-1.5 font-semibold disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}
