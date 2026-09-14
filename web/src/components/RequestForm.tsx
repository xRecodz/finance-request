"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { OutletCombobox } from "@/components/OutletCombobox";
import { api, ApiError } from "@/lib/api";
import {
  APPROVER_CATEGORY_NIPS,
  type CategoryMode,
  type SekretariatDest,
} from "@/lib/approverCategories";
import { formatRupiah } from "@/lib/format";
import type {
  ApproverOption,
  ApproverTrack,
  CategoryOption,
  RequestItem,
  RequestRow,
} from "@/lib/types";

const emptyItem = (): RequestItem => ({
  name: "",
  spec: "",
  quantity: 1,
  unit: "pcs",
  unitPrice: 0,
  note: "",
});

function toDateInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

type Props = {
  mode: "create" | "edit";
  initial?: RequestRow;
  onSave: (payload: Record<string, unknown>, submitNow: boolean) => Promise<void>;
};

export function RequestForm({ mode, initial, onSave }: Props) {
  const [approvers, setApprovers] = useState<ApproverOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [track, setTrack] = useState<ApproverTrack>(initial?.track || "DIREKTUR");
  const [type, setType] = useState<string>(initial?.type || "DANA");
  const [approverId, setApproverId] = useState(initial?.approver?.id || "");
  /** Head Office | Outlet — label UI; mapping ke approver di belakang layar. */
  const [dest, setDest] = useState<SekretariatDest>("HO");
  const [categoryId, setCategoryId] = useState(initial?.category?.id || "");
  const [outletQuery, setOutletQuery] = useState(initial?.category?.name || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [purpose, setPurpose] = useState(initial?.purpose || "");
  const [neededDate, setNeededDate] = useState(toDateInput(initial?.neededDate));
  const [bankName, setBankName] = useState(initial?.bankName || "");
  const [bankAccountNumber, setBankAccountNumber] = useState(initial?.bankAccountNumber || "");
  const [bankAccountHolder, setBankAccountHolder] = useState(initial?.bankAccountHolder || "");
  const [items, setItems] = useState<RequestItem[]>(
    initial?.items?.length
      ? initial.items.map((item) => ({
          name: item.name,
          spec: item.spec || "",
          quantity: Number(item.quantity),
          unit: item.unit || "pcs",
          unitPrice: Number(item.unitPrice),
          note: item.note || "",
        }))
      : [emptyItem()]
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      api<{ data: ApproverOption[] }>("/api/meta/approvers"),
      api<{ data: CategoryOption[] }>("/api/meta/categories"),
    ]).then(([a, c]) => {
      setApprovers(a.data);
      setCategories(c.data);
    });
  }, []);

  const sekretariatUser = useMemo(
    () => approvers.find((a) => a.nip === APPROVER_CATEGORY_NIPS.SEKRETARIAT),
    [approvers]
  );
  const financeOutletUser = useMemo(
    () => approvers.find((a) => a.nip === APPROVER_CATEGORY_NIPS.FINANCE_OUTLET),
    [approvers]
  );
  const financeHoUser = useMemo(
    () => approvers.find((a) => a.nip === APPROVER_CATEGORY_NIPS.FINANCE_HO),
    [approvers]
  );

  const tracksWithApprovers = useMemo(() => {
    const set = new Set<ApproverTrack>();
    for (const a of approvers) set.add(a.approverTrack);
    return set;
  }, [approvers]);

  const categoryMode: CategoryMode = dest === "OUTLET" ? "outlet" : "head_office";

  const visibleCategories = useMemo(() => {
    if (categoryMode === "outlet") {
      return categories.filter((c) => c.kind === "OUTLET" || c.code.startsWith("OUT_"));
    }
    return categories.filter(
      (c) => (c.kind === "STANDARD" || !c.kind || !c.code.startsWith("OUT_")) && c.code !== "OPS"
    );
  }, [categories, categoryMode]);

  // Mapping: Sekretariat→Bu Sari; Finance+Outlet→Belly; Finance+HO→Resi
  useEffect(() => {
    if (track === "DIREKTUR") {
      if (sekretariatUser && approverId !== sekretariatUser.id) {
        setApproverId(sekretariatUser.id);
      }
      return;
    }
    if (track === "FINANCE") {
      const target = dest === "OUTLET" ? financeOutletUser : financeHoUser;
      if (target && approverId !== target.id) {
        setApproverId(target.id);
      }
    }
  }, [track, dest, sekretariatUser, financeOutletUser, financeHoUser, approverId]);

  useEffect(() => {
    if (!categoryId) return;
    const stillValid = visibleCategories.some((c) => c.id === categoryId);
    if (!stillValid) {
      setCategoryId("");
      setOutletQuery("");
    }
  }, [categoryMode, visibleCategories, categoryId]);

  useEffect(() => {
    if (mode !== "edit" || !initial?.category) return;
    const isOutlet =
      Boolean(initial.category.code?.startsWith("OUT_")) ||
      categories.find((c) => c.id === initial.category?.id)?.kind === "OUTLET";
    setDest(isOutlet ? "OUTLET" : "HO");
  }, [mode, initial?.category, categories]);

  const total = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
  const isRevisi = initial?.status === "REVISI";

  function updateItem(index: number, patch: Partial<RequestItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function resolveCategoryId(): Promise<string | null> {
    if (categoryMode === "head_office") {
      return categoryId || null;
    }
    if (categoryId) return categoryId;
    const name = outletQuery.trim();
    if (!name) return null;
    const res = await api<{ data: CategoryOption }>("/api/meta/outlets", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setCategories((prev) =>
      prev.some((c) => c.id === res.data.id) ? prev : [...prev, { ...res.data, kind: "OUTLET" }]
    );
    setCategoryId(res.data.id);
    return res.data.id;
  }

  function buildPayload(submitNow: boolean, resolvedCategoryId: string | null) {
    return {
      type,
      track,
      approverId,
      categoryId: resolvedCategoryId,
      title,
      purpose,
      neededDate: neededDate || null,
      bankName: bankName || null,
      bankAccountNumber: bankAccountNumber || null,
      bankAccountHolder: bankAccountHolder || null,
      items: items.map((item) => ({
        name: item.name,
        spec: item.spec || null,
        quantity: Number(item.quantity),
        unit: item.unit || "pcs",
        unitPrice: Number(item.unitPrice),
        note: item.note || null,
      })),
      submit: submitNow,
    };
  }

  async function submit(submitNow: boolean) {
    setError("");
    setSaving(true);
    try {
      if (!approverId) throw new ApiError("Pilih tujuan pengajuan", 400);
      const resolved = await resolveCategoryId();
      if (!resolved) {
        throw new ApiError(
          categoryMode === "outlet" ? "Kategori outlet wajib diisi" : "Kategori wajib dipilih",
          400
        );
      }
      await onSave(buildPayload(submitNow, resolved), submitNow);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan pengajuan");
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="brand-mark text-3xl font-bold">
            {mode === "create" ? "Buat Pengajuan" : isRevisi ? "Revisi Pengajuan" : "Edit Draft"}
          </h1>
          <p className="text-sli-muted">
            {mode === "create"
              ? "Isi detail permohonan, item, dan tujuan approval."
              : `${initial?.number || ""} — ubah data lalu simpan draft atau kirim ke approval.`}
          </p>
        </div>
        {mode === "edit" ? (
          <Link
            href={`/pemohon/requests/${initial?.id}`}
            className="btn-ghost rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Batal
          </Link>
        ) : null}
      </div>

      {isRevisi && initial?.decisionNote ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Catatan revisi dari approver</p>
          <p className="mt-1 whitespace-pre-wrap">{initial.decisionNote}</p>
        </div>
      ) : null}

      <div className="panel grid gap-4 rounded-2xl p-5 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold">Judul pengajuan</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold">Keperluan / uraian</span>
          <textarea
            className="input min-h-28"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Jenis pengajuan</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="DANA">Dana</option>
            <option value="BARANG">Barang</option>
            <option value="REIMBURSEMENT">Reimbursement</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Jalur Pengajuan</span>
          <select
            className="input"
            value={track}
            onChange={(e) => {
              setTrack(e.target.value as ApproverTrack);
              setCategoryId("");
              setOutletQuery("");
            }}
          >
            <option value="DIREKTUR" disabled={!tracksWithApprovers.has("DIREKTUR")}>
              Sekretariat{!tracksWithApprovers.has("DIREKTUR") ? " (tidak tersedia)" : ""}
            </option>
            <option value="FINANCE" disabled={!tracksWithApprovers.has("FINANCE")}>
              Finance{!tracksWithApprovers.has("FINANCE") ? " (tidak tersedia)" : ""}
            </option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Pengajuan kepada</span>
          <select
            className="input"
            value={dest}
            onChange={(e) => {
              setDest(e.target.value as SekretariatDest);
              setCategoryId("");
              setOutletQuery("");
            }}
            required
          >
            <option value="OUTLET" disabled={track === "FINANCE" && !financeOutletUser}>
              Outlet
            </option>
            <option value="HO" disabled={track === "FINANCE" && !financeHoUser}>
              Head Office
            </option>
          </select>
          <p className="mt-1 text-xs text-sli-muted">
            {track === "DIREKTUR"
              ? "Approval ke Sekretariat. Head Office / Outlet menentukan kategori."
              : dest === "OUTLET"
                ? "Approval ke Finance (Outlet). Kategori: daftar outlet."
                : "Approval ke Finance (Head Office). Kategori: tanpa Operasional."}
          </p>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">
            {categoryMode === "outlet" ? "Kategori (Outlet)" : "Kategori (Head Office)"}
          </span>
          {categoryMode === "outlet" ? (
            <OutletCombobox
              options={visibleCategories}
              valueId={categoryId}
              query={outletQuery}
              required
              onQueryChange={setOutletQuery}
              onChange={(id, name) => {
                setCategoryId(id);
                if (name) setOutletQuery(name);
              }}
            />
          ) : (
            <select
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">— pilih kategori —</option>
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Tanggal dibutuhkan</span>
          <input
            className="input"
            type="date"
            value={neededDate}
            onChange={(e) => setNeededDate(e.target.value)}
          />
        </label>
      </div>

      <div className="panel grid gap-4 rounded-2xl p-5 md:grid-cols-3">
        <h2 className="md:col-span-3 font-semibold">Rekening pencairan (opsional)</h2>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Nama bank</span>
          <input
            className="input"
            placeholder="Contoh: BCA, Mandiri"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            autoComplete="organization"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Nomor rekening</span>
          <input
            className="input"
            placeholder="Nomor rekening"
            inputMode="numeric"
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Atas nama / penerima</span>
          <input
            className="input"
            placeholder="Nama pemilik rekening"
            value={bankAccountHolder}
            onChange={(e) => setBankAccountHolder(e.target.value)}
            autoComplete="name"
          />
        </label>
      </div>

      <div className="panel rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Item / barang</h2>
          <button
            type="button"
            className="btn-ghost rounded-xl px-3 py-1.5 text-sm font-semibold"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
          >
            + Item
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-sli-line p-3 md:grid-cols-6">
              <input
                className="input md:col-span-2"
                placeholder="Nama item"
                value={item.name}
                onChange={(e) => updateItem(index, { name: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="Qty"
                type="number"
                min={0.01}
                step="0.01"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                required
              />
              <input
                className="input"
                placeholder="Satuan"
                value={item.unit}
                onChange={(e) => updateItem(index, { unit: e.target.value })}
              />
              <input
                className="input"
                placeholder="Harga"
                type="number"
                min={0}
                step="1"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                required
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-sli-red">
                  {formatRupiah(Number(item.quantity) * Number(item.unitPrice))}
                </span>
                {items.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-sli-muted hover:text-sli-red"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Hapus
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end border-t border-sli-line pt-4">
          <p className="text-lg font-bold">
            Total: <span className="text-sli-red">{formatRupiah(total)}</span>
          </p>
        </div>
      </div>

      {error ? <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          className="btn-ghost rounded-xl px-4 py-2.5 text-sm font-semibold"
          onClick={() => void submit(false)}
        >
          {mode === "edit" ? "Simpan Perubahan" : "Simpan Draft"}
        </button>
        <button type="submit" disabled={saving} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">
          {saving ? "Mengirim..." : isRevisi ? "Kirim Ulang" : "Kirim Pengajuan"}
        </button>
      </div>
    </form>
  );
}
