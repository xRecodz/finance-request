"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { StatCard } from "@/components/StatCard";

const RoleBarChart = dynamic(
  () => import("@/components/DashboardCharts").then((module) => module.RoleBarChart),
  { ssr: false }
);

type Overview = {
  activeUsers: number;
  inactiveUsers: number;
  incompleteProfiles: number;
  pendingManager: number;
  pendingPayout: number;
  byRole: Array<{ role: string; count: number }>;
};

export default function ItOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ data: Overview }>("/api/settings/overview")
      .then((result) => setData(result.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat dashboard"));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-bold text-sli-ink">Dashboard IT</h1>
        <p className="mt-1 text-sm text-sli-muted">Kesehatan akun dan antrean pengajuan seluruh perusahaan.</p>
      </div>
      {error ? <p className="rounded-xl bg-sli-red-soft p-3 text-sm text-sli-red">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Akun Aktif" value={String(data?.activeUsers ?? "—")} />
        <StatCard label="Profil Belum Lengkap" value={String(data?.incompleteProfiles ?? "—")} />
        <StatCard label="Akun Nonaktif" value={String(data?.inactiveUsers ?? "—")} />
        <StatCard label="Menunggu Manager" value={String(data?.pendingManager ?? "—")} />
        <StatCard label="Siap Dicairkan" value={String(data?.pendingPayout ?? "—")} />
      </div>
      <div className="panel rounded-2xl p-5">
        <h2 className="font-semibold">Karyawan aktif menurut divisi pengajuan</h2>
        <div className="mt-4 h-80">{data ? <RoleBarChart data={data.byRole} /> : null}</div>
      </div>
    </div>
  );
}
