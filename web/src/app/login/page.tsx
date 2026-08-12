"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { homePathForRole, type Portal } from "@/lib/types";

function parsePortal(value: string | null): Portal {
  if (value === "APPROVAL" || value === "IT") return value;
  return "PEMOHON";
}

function LoginForm() {
  const params = useSearchParams();
  const portal = parsePortal(params.get("portal"));
  const { login } = useAuth();
  const router = useRouter();
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => {
    if (portal === "APPROVAL") return "Portal Approval";
    if (portal === "IT") return "Portal IT";
    return "Portal Pemohon";
  }, [portal]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(nip.trim(), password, portal);
      if (user.mustChangePassword) router.replace("/change-password");
      else router.replace(homePathForRole(user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel w-full rounded-3xl p-7 shadow-xl shadow-sli-red/10 md:p-8"
      >
        <Link href="/" className="brand-mark text-2xl font-bold text-sli-red">
          SL INDONESIA
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-sli-ink">{title}</h1>
        <p className="mt-1 text-sm text-sli-muted">
          {portal === "IT"
            ? "Masuk dengan akun IT untuk mengelola user."
            : "Masuk dengan NIP yang terdaftar di HRIS."}
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">NIP</span>
            <input
              className="input"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Contoh: 1511.1.77.xxxx"
              autoComplete="username"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div>
          ) : null}

          <button type="submit" disabled={loading} className="btn-primary w-full rounded-xl px-4 py-3 font-semibold">
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-sli-muted">
          <Link href="/" className="font-semibold text-sli-red hover:underline">
            Kembali pilih portal
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Memuat...</div>}>
      <LoginForm />
    </Suspense>
  );
}
