"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { homePathForRole } from "@/lib/types";

export default function ChangePasswordPage() {
  const { user, loading, changePassword } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("100100");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      router.replace(user ? homePathForRole(user.role) : "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengganti password");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sli-muted">Memuat...</div>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel w-full rounded-3xl p-7 shadow-xl md:p-8"
      >
        <p className="brand-mark text-2xl font-bold text-sli-red">SL INDONESIA</p>
        <h1 className="mt-3 text-2xl font-bold">Ganti Password</h1>
        <p className="mt-1 text-sm text-sli-muted">
          Halo, <strong>{user.name}</strong>. Demi keamanan, password default wajib diganti sebelum
          menggunakan fitur pengajuan.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Password saat ini</span>
            <input
              className="input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Password baru</span>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter, huruf + angka"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Konfirmasi password baru</span>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
          {error ? (
            <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div>
          ) : null}
          <button type="submit" disabled={saving} className="btn-primary w-full rounded-xl px-4 py-3 font-semibold">
            {saving ? "Menyimpan..." : "Simpan & Lanjut"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
