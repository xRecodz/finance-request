"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    router.replace(user.role === "APPROVER" || user.role === "ADMIN" ? "/approval" : "/pemohon");
  }, [user, loading, router]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] bg-gradient-to-b from-sli-red via-sli-red-deep to-transparent opacity-95" />
      <div className="pointer-events-none absolute -left-20 top-40 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mb-10 text-center text-white md:mb-14"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
            Corporate Finance Desk
          </p>
          <h1 className="brand-mark text-5xl font-bold tracking-tight md:text-7xl">SL INDONESIA</h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/90 md:text-lg">
            Portal resmi permohonan dana & barang — pengajuan, approval, pencairan, hingga LPJ.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <PortalCard
            href="/login?portal=PEMOHON"
            icon={<FileSpreadsheet className="text-sli-red" size={28} />}
            title="Pemohon"
            desc="Ajukan permohonan dana/barang, pantau status, cetak form, dan unggah LPJ."
            delay={0.1}
          />
          <PortalCard
            href="/login?portal=APPROVAL"
            icon={<ShieldCheck className="text-sli-red" size={28} />}
            title="Approval"
            desc="Tinjau antrian pending, setujui nominal, cairkan dana, dan verifikasi LPJ."
            delay={0.2}
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-10 text-center text-sm text-sli-muted"
        >
        </motion.p>
      </main>
    </div>
  );
}

function PortalCard({
  href,
  icon,
  title,
  desc,
  delay,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Link
        href={href}
        className="panel group flex h-full flex-col rounded-3xl p-6 shadow-lg shadow-sli-red/10 transition hover:-translate-y-1 hover:shadow-xl md:p-8"
      >
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sli-red-soft">
          {icon}
        </div>
        <h2 className="brand-mark text-3xl font-bold text-sli-ink">{title}</h2>
        <p className="mt-3 flex-1 text-sli-muted">{desc}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sli-red">
          Masuk portal
          <ArrowRight size={16} className="transition group-hover:translate-x-1" />
        </span>
      </Link>
    </motion.div>
  );
}
