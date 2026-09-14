"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { ApproverTrack, ManagedUser, UserRole } from "@/lib/types";

type FormState = {
  nip: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  role: Exclude<UserRole, "ADMIN">;
  approverTrack: ApproverTrack | "";
};

const initial: FormState = {
  nip: "",
  name: "",
  email: "",
  phone: "",
  position: "",
  department: "",
  role: "PEMOHON",
  approverTrack: "",
};

export default function ItCreateUserPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await api<{ data: ManagedUser; message?: string }>("/api/users", {
        method: "POST",
        body: JSON.stringify({
          nip: form.nip.trim(),
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          position: form.position.trim() || null,
          department: form.department.trim() || null,
          role: form.role,
          approverTrack: form.role === "APPROVER" ? form.approverTrack || null : null,
        }),
      });
      router.replace(`/it/users/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membuat user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-6">
      <div>
        <Link href="/it" className="text-sm font-semibold text-sli-red hover:underline">
          ← Kembali
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-sli-ink">Tambah User</h1>
        <p className="mt-1 text-sm text-sli-muted">
          Password awal = default sistem; user wajib ganti saat login pertama.
        </p>
      </div>

      <form onSubmit={onSubmit} className="panel space-y-4 rounded-2xl p-5 md:p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">NIP *</span>
          <input
            className="input"
            value={form.nip}
            onChange={(e) => set("nip", e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Nama *</span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Email</span>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Telepon</span>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Jabatan</span>
            <input
              className="input"
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Departemen</span>
            <input
              className="input"
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Role *</span>
            <select
              className="input"
              value={form.role}
              onChange={(e) => set("role", e.target.value as FormState["role"])}
            >
              <option value="PEMOHON">Pemohon</option>
              <option value="APPROVER">Approver</option>
              <option value="IT">IT</option>
            </select>
          </label>
          {form.role === "APPROVER" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Jalur approval *</span>
              <select
                className="input"
                value={form.approverTrack}
                onChange={(e) => set("approverTrack", e.target.value as ApproverTrack | "")}
                required
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

        {error ? (
          <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div>
        ) : null}

        <button type="submit" disabled={saving} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">
          {saving ? "Menyimpan..." : "Buat User"}
        </button>
      </form>
    </div>
  );
}
