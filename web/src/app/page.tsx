"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, FileSpreadsheet, MonitorCog } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homePathForRole } from "@/lib/types";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    if (!user.onboardingComplete) {
      router.replace("/setup-profile");
      return;
    }
    router.replace(homePathForRole(user.role));
  }, [user, loading, router]);

  if (loading || user) {
    return <div className="flex min-h-screen items-center justify-center text-sli-muted">Memuat portal...</div>;
  }

  return (
    <div className="landing-stage relative min-h-screen overflow-hidden">
      <LandingBackdrop />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 text-center text-white md:mb-14"
        >
          <motion.p
            className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/85"
          >
            Corporate Finance Desk
          </motion.p>

          <motion.h1
            className="brand-mark text-5xl font-bold tracking-tight drop-shadow-sm md:text-7xl"
          >
            SL INDONESIA
          </motion.h1>

          <motion.p
            className="mx-auto mt-4 max-w-xl text-base text-white/92 md:text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Portal resmi permohonan dana & barang — pengajuan, approval, pencairan, hingga LPJ.
          </motion.p>

          <div className="mx-auto mt-6 h-[2px] w-24 rounded-full bg-white/80" />
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
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
          <PortalCard
            href="/login?portal=IT"
            icon={<MonitorCog className="text-sli-red" size={28} />}
            title="Portal IT"
            desc="Kelola akun karyawan: tambah user, edit profil, aktif/nonaktif, reset password."
            delay={0.4}
          />
        </div>

        <p className="mt-10 text-center text-sm font-medium text-white/70">
          Pilih portal untuk melanjutkan
        </p>
      </main>
    </div>
  );
}

/** Background merah–putih penuh: mesh, batik, gelombang, bentuk geometris bergerak. */
function LandingBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Dasar: mesh merah–putih (bukan gradasi polos) */}
      <div className="landing-mesh absolute inset-0" />

      {/* Pita diagonal putih/merah yang bergeser */}
      <div className="landing-ribbons absolute -inset-[20%]" />

      {/* Lapisan batik kawung putih */}
      <div className="landing-batik absolute inset-0" />

      {/* Lapisan batik sekunder (offset) */}
      <div className="landing-batik-alt absolute inset-0" />

      {/* Orbs cahaya */}
      <div className="absolute -left-28 top-10 h-[28rem] w-[28rem] rounded-full bg-white/20 blur-3xl" />
      <div className="absolute -right-24 top-24 h-[32rem] w-[32rem] rounded-full bg-[#7f0a16]/45 blur-3xl" />
      <div className="absolute bottom-10 left-[20%] h-72 w-72 rounded-full bg-white/25 blur-3xl" />

      {/* Bentuk geometris mengambang */}
      <div className="absolute left-[8%] top-[22%] h-16 w-16 rotate-45 border-2 border-white/25" />
      <div className="absolute right-[12%] top-[30%] h-24 w-24 rounded-full border border-white/30" />
      <div className="absolute bottom-[28%] left-[15%] h-3 w-28 rounded-full bg-white/30" />
      <div className="absolute right-[18%] bottom-[32%] h-12 w-12 rounded-full bg-white/15" />

      {/* Gelombang putih di bawah (transisi ke area kartu) */}
      <svg
        className="absolute bottom-0 left-0 w-[200%] text-white/90"
        viewBox="0 0 1440 180"
        preserveAspectRatio="none"
        style={{ height: "28vh" }}
      >
        <path
          fill="currentColor"
          d="M0,96 C240,160 480,20 720,80 C960,140 1200,40 1440,90 L1440,180 L0,180 Z"
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-[200%] text-[#fff8f7]"
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
        style={{ height: "18vh" }}
      >
        <path
          fill="currentColor"
          d="M0,70 C320,120 640,10 960,60 C1120,85 1280,40 1440,55 L1440,140 L0,140 Z"
        />
      </svg>

      {/* Partikel putih kecil */}
      {[
        { left: "12%", top: "18%", size: 4 },
        { left: "28%", top: "12%", size: 3 },
        { left: "55%", top: "20%", size: 5 },
        { left: "72%", top: "14%", size: 3 },
        { left: "88%", top: "26%", size: 4 },
        { left: "40%", top: "35%", size: 3 },
      ].map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white/70"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
        />
      ))}
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
        className="panel group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 shadow-xl shadow-sli-red/15 md:p-8"
      >
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sli-red-soft">
          {icon}
        </div>

        <h2 className="brand-mark text-3xl font-bold text-sli-ink">{title}</h2>
        <p className="mt-3 flex-1 text-sli-muted">{desc}</p>

        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sli-red">
          Masuk portal
          <span className="inline-flex">
            <ArrowRight size={16} />
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
