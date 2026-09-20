"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah } from "@/lib/format";
import type { DashboardSummary } from "@/lib/types";

const COLORS = ["#b01020", "#7f0a16", "#d97706", "#0f7a4a", "#1d4f91", "#6b7280", "#be123c"];

export function MonthlyRequestChart({
  data,
  showDisbursed = false,
}: {
  data: DashboardSummary["monthlyChart"];
  showDisbursed?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8d5d8" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => formatRupiah(Number(value))} />
        {showDisbursed ? <Bar dataKey="approvedAmount" name="Dicairkan" fill="#0f7a4a" radius={[6, 6, 0, 0]} /> : null}
        <Bar dataKey="totalAmount" name="Diajukan" fill={showDisbursed ? "#f2b8bf" : "#b01020"} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data }: { data: DashboardSummary["statusChart"] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={3}>
          {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RoleBarChart({ data }: { data: Array<{ role: string; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 0, right: 15 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8d5d8" />
        <XAxis dataKey="role" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={65} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" name="Karyawan" fill="#b01020" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
