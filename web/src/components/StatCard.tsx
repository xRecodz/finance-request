"use client";

import { motion } from "framer-motion";

export function StatCard({
  label,
  value,
  hint,
  accent = "red",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "red" | "ink" | "green";
}) {
  const accentClass =
    accent === "green"
      ? "from-[#0f7a4a]/10 to-transparent"
      : accent === "ink"
        ? "from-sli-ink/10 to-transparent"
        : "from-sli-red/15 to-transparent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`panel relative overflow-hidden rounded-2xl p-5 shadow-sm`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentClass}`} />
      <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-sli-muted">
        {label}
      </p>
      <p className="brand-mark relative mt-2 text-2xl font-bold text-sli-ink md:text-3xl">{value}</p>
      {hint ? <p className="relative mt-1 text-sm text-sli-muted">{hint}</p> : null}
    </motion.div>
  );
}
