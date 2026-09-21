import { describe, expect, it } from "vitest";
import { requestBodySchema } from "./requests";

const base = { type: "DANA", track: "FINANCE", destination: "HO" };

describe("validasi pengajuan", () => {
  it("menerima draft yang belum lengkap agar bisa dilanjutkan nanti", () => {
    const result = requestBodySchema.safeParse({
      ...base,
      categoryId: null,
      title: "",
      purpose: "",
      items: [{ name: "", quantity: 0, unit: "", unitPrice: 0 }],
      submit: false,
    });
    expect(result.success).toBe(true);
  });

  it("menolak pengiriman draft yang belum lengkap dengan nama kolom", () => {
    const result = requestBodySchema.safeParse({
      ...base,
      categoryId: null,
      title: "A",
      purpose: "B",
      items: [{ name: "", quantity: 0, unit: "", unitPrice: 0 }],
      submit: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        title: ["Judul minimal 3 karakter"],
        purpose: ["Keperluan minimal 5 karakter"],
        categoryId: ["Kategori tujuan wajib dipilih"],
      });
      expect(result.error.flatten().fieldErrors.items?.length).toBe(3);
    }
  });

  it("menerima pengajuan lengkap dan menghitung angka dari formulir", () => {
    const result = requestBodySchema.safeParse({
      ...base,
      categoryId: "category-1",
      title: "Dana operasional",
      purpose: "Pembelian keperluan kantor",
      items: [{ name: "Kertas", quantity: "2", unit: "pcs", unitPrice: "10000" }],
      submit: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.items[0]).toMatchObject({ quantity: 2, unitPrice: 10000 });
  });
});
