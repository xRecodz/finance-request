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
      {/* Hero plane */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[58vh] bg-gradient-to-b from-sli-red via-sli-red-deep to-transparent opacity-95" />

      {/* Orbs bergerak lembut */}
      <motion.div
        className="pointer-events-none absolute -left-24 top-28 h-80 w-80 rounded-full bg-white/15 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 28, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-20 top-16 h-96 w-96 rounded-full bg-white/12 blur-3xl"
        animate={{ x: [0, -36, 0], y: [0, 32, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-16 left-1/3 h-64 w-64 rounded-full bg-sli-red/10 blur-3xl"
        animate={{ x: [0, 50, -20, 0], y: [0, -30, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Motif batik drift */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1.4'%3E%3Cpath d='M60 10c8 14 22 22 36 22-14 8-22 22-22 36-8-14-22-22-36-22 14-8 22-22 22-36z'/%3E%3Ccircle cx='20' cy='20' r='5'/%3E%3Ccircle cx='100' cy='100' r='5'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
        animate={{ backgroundPosition: ["0% 0%", "40% 30%", "0% 0%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 text-center text-white md:mb-14"
        >
          <motion.p
            className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/80"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            Corporate Finance Desk
          </motion.p>

          <motion.h1
            className="brand-mark text-5xl font-bold tracking-tight md:text-7xl"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            SL INDONESIA
          </motion.h1>

          <motion.p
            className="mx-auto mt-4 max-w-xl text-base text-white/90 md:text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
          >
            Portal resmi permohonan dana & barang — pengajuan, approval, pencairan, hingga LPJ.
          </motion.p>

          {/* Garis aksen bergerak */}
          <motion.div
            className="mx-auto mt-6 h-[2px] w-24 rounded-full bg-white/70"
            animate={{ width: ["4rem", "7rem", "4rem"], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <PortalCard
            href="/login?portal=PEMOHON"
            icon={<FileSpreadsheet className="text-sli-red" size={28} />}
            title="Pemohon"
            desc="Ajukan permohonan dana/barang, pantau status, cetak form, dan unggah LPJ."
            delay={0.15}
          />
          <PortalCard
            href="/login?portal=APPROVAL"
            icon={<ShieldCheck className="text-sli-red" size={28} />}
            title="Approval"
            desc="Tinjau antrian pending, setujui nominal, cairkan dana, dan verifikasi LPJ."
            delay={0.28}
          />
        </div>

        <motion.p
          className="mt-10 text-center text-sm text-sli-muted"
          animate={{ opacity: [0.45, 0.9, 0.45], y: [0, -2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          Pilih portal untuk melanjutkan
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
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
    >
      <Link
        href={href}
        className="panel group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 shadow-lg shadow-sli-red/10 md:p-8"
      >
        {/* Shine sweep */}
        <motion.span
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
          initial={{ x: "-120%" }}
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut", delay }}
        />

        <motion.div
          className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sli-red-soft"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: delay + 0.2 }}
        >
          {icon}
        </motion.div>

        <h2 className="brand-mark text-3xl font-bold text-sli-ink">{title}</h2>
        <p className="mt-3 flex-1 text-sli-muted">{desc}</p>

        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sli-red">
          Masuk portal
          <motion.span
            animate={{ x: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex"
          >
            <ArrowRight size={16} />
          </motion.span>
        </span>
      </Link>
    </motion.div>
  );
}
