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
    router.replace(homePathForRole(user.role));
  }, [user, loading, router]);

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
            animate={{ opacity: [0.65, 1, 0.65], letterSpacing: ["0.28em", "0.38em", "0.28em"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            Corporate Finance Desk
          </motion.p>

          <motion.h1
            className="brand-mark text-5xl font-bold tracking-tight drop-shadow-sm md:text-7xl"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
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

          <motion.div
            className="mx-auto mt-6 h-[2px] rounded-full bg-white/80"
            animate={{ width: ["3.5rem", "8rem", "3.5rem"], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          />
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

        <motion.p
          className="mt-10 text-center text-sm font-medium text-white/70"
          animate={{ opacity: [0.4, 0.95, 0.4], y: [0, -3, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        >
          Pilih portal untuk melanjutkan
        </motion.p>
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
      <motion.div
        className="landing-ribbons absolute -inset-[20%]"
        animate={{ x: ["0%", "6%", "0%"], y: ["0%", "-3%", "0%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Lapisan batik kawung putih */}
      <motion.div
        className="landing-batik absolute inset-0"
        animate={{ backgroundPosition: ["0px 0px", "180px 120px", "0px 0px"] }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      />

      {/* Lapisan batik sekunder (offset) */}
      <motion.div
        className="landing-batik-alt absolute inset-0"
        animate={{ backgroundPosition: ["0px 0px", "-140px 90px", "0px 0px"], opacity: [0.12, 0.22, 0.12] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbs cahaya */}
      <motion.div
        className="absolute -left-28 top-10 h-[28rem] w-[28rem] rounded-full bg-white/20 blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, 35, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-24 top-24 h-[32rem] w-[32rem] rounded-full bg-[#7f0a16]/45 blur-3xl"
        animate={{ x: [0, -45, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="absolute bottom-10 left-[20%] h-72 w-72 rounded-full bg-white/25 blur-3xl"
        animate={{ x: [0, 60, -15, 0], y: [0, -40, 12, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bentuk geometris mengambang */}
      <motion.div
        className="absolute left-[8%] top-[22%] h-16 w-16 rotate-45 border-2 border-white/25"
        animate={{ rotate: [45, 70, 45], y: [0, -18, 0], opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[12%] top-[30%] h-24 w-24 rounded-full border border-white/30"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[28%] left-[15%] h-3 w-28 rounded-full bg-white/30"
        animate={{ scaleX: [0.6, 1.2, 0.6], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[18%] bottom-[32%] h-12 w-12 rounded-full bg-white/15"
        animate={{ y: [0, -22, 0], x: [0, 12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Gelombang putih di bawah (transisi ke area kartu) */}
      <svg
        className="absolute bottom-0 left-0 w-[200%] text-white/90"
        viewBox="0 0 1440 180"
        preserveAspectRatio="none"
        style={{ height: "28vh" }}
      >
        <motion.path
          fill="currentColor"
          d="M0,96 C240,160 480,20 720,80 C960,140 1200,40 1440,90 L1440,180 L0,180 Z"
          animate={{
            d: [
              "M0,96 C240,160 480,20 720,80 C960,140 1200,40 1440,90 L1440,180 L0,180 Z",
              "M0,80 C240,30 480,150 720,100 C960,50 1200,140 1440,70 L1440,180 L0,180 Z",
              "M0,96 C240,160 480,20 720,80 C960,140 1200,40 1440,90 L1440,180 L0,180 Z",
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-[200%] text-[#fff8f7]"
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
        style={{ height: "18vh" }}
      >
        <motion.path
          fill="currentColor"
          d="M0,70 C320,120 640,10 960,60 C1120,85 1280,40 1440,55 L1440,140 L0,140 Z"
          animate={{
            d: [
              "M0,70 C320,120 640,10 960,60 C1120,85 1280,40 1440,55 L1440,140 L0,140 Z",
              "M0,50 C320,10 640,110 960,70 C1120,45 1280,100 1440,65 L1440,140 L0,140 Z",
              "M0,70 C320,120 640,10 960,60 C1120,85 1280,40 1440,55 L1440,140 L0,140 Z",
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
      </svg>

      {/* Partikel putih kecil */}
      {[
        { left: "12%", top: "18%", size: 4, dur: 5 },
        { left: "28%", top: "12%", size: 3, dur: 6.5 },
        { left: "55%", top: "20%", size: 5, dur: 7 },
        { left: "72%", top: "14%", size: 3, dur: 5.5 },
        { left: "88%", top: "26%", size: 4, dur: 8 },
        { left: "40%", top: "35%", size: 3, dur: 6 },
      ].map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white/70"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, -18, 0], opacity: [0.2, 0.85, 0.2] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
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
        <motion.span
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
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
