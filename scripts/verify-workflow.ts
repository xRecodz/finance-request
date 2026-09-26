/** Uji end-to-end hanya pada salinan database bernama sl_finance_test. */
import "dotenv/config";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { hashPassword, signToken } from "../src/lib/auth";
import { loadAuthUser } from "../src/lib/authUser";

async function main() {
  if (!process.env.DATABASE_URL?.includes("sl_finance_test")) throw new Error("Hanya boleh dijalankan pada sl_finance_test");
  const app = createApp();
  const category = await prisma.category.findFirst({ where: { kind: "STANDARD", isActive: true } });
  const openingCategory = await prisma.category.findFirst({ where: { code: "OPEN", isActive: true } });
  const outlet = await prisma.category.findFirst({ where: { kind: "OUTLET", isActive: true } });
  assert(category, "Kategori HO tidak ada");
  assert(openingCategory, "Kategori Opening Outlet tidak ada");
  assert(outlet, "Kategori outlet tidak ada");
  const person = async (nip: string) => {
    const user = await prisma.user.findUnique({ where: { nip } });
    assert(user?.isActive, `NIP ${nip} tidak aktif/tidak ada`);
    const auth = await loadAuthUser(user.id);
    assert(auth);
    return { user, token: signToken(auth) };
  };
  const scenarios = [
    { role: "GA", track: "FINANCE", destination: "HO", managerNip: "1109.0.86.00052", officerNip: "1906.0.96.05580", direct: false, opening: false },
    { role: "IT", track: "DIREKTUR", destination: "HO", managerNip: "1511.1.77.00020", officerNip: "1109.0.86.00052", direct: true, opening: false },
    { role: "IT", track: "FINANCE", destination: "HO", managerNip: "1511.1.77.00020", officerNip: "1906.0.96.05580", direct: false, opening: false },
    { role: "HRD", track: "DIREKTUR", destination: "HO", managerNip: "1109.0.86.00052", officerNip: "1109.0.86.00052", direct: true, opening: false },
    { role: "OPERASIONAL", track: "FINANCE", destination: "OUTLET", managerNip: "1511.1.77.00020", officerNip: "1512.0.94.01171", direct: false, opening: false },
    { role: "OPERASIONAL", track: "FINANCE", destination: "HO", managerNip: "1511.1.77.00020", officerNip: "1906.0.96.05580", direct: true, opening: true },
  ] as const;
  await prisma.user.updateMany({ where: { nip: { in: [...new Set(scenarios.flatMap(item => [item.managerNip, item.officerNip]))] } }, data: { mustChangePassword: false, onboardingComplete: true } });
  const adminUser = await prisma.user.create({ data: { nip: `TEST-IT-${Date.now()}`, name: "Admin Uji", passwordHash: await hashPassword("Testing1234"), role: "IT", businessRole: "IT", workLocation: "HO", onboardingComplete: true, mustChangePassword: false } });
  const adminAuth = await loadAuthUser(adminUser.id);
  assert(adminAuth);
  const adminToken = signToken(adminAuth);
  const setOutletManager = await request(app).put("/api/settings/manager-route").set("Authorization", `Bearer ${adminToken}`).send({ businessRole: "OPERASIONAL", outletCategoryId: outlet.id, managerNip: "1511.1.77.00020" });
  assert.equal(setOutletManager.status, 200, JSON.stringify(setOutletManager.body));
  const overview = await request(app).get("/api/settings/overview").set("Authorization", `Bearer ${adminToken}`);
  assert.equal(overview.status, 200, JSON.stringify(overview.body));
  for (const [index, scenario] of scenarios.entries()) {
    const nip = `TEST-WORKFLOW-${Date.now()}-${index}`;
    const user = await prisma.user.create({ data: {
      nip, name: `Uji ${scenario.role}`, passwordHash: await hashPassword("Testing1234"),
      businessRole: scenario.role, workLocation: scenario.destination, homeOutletId: scenario.destination === "OUTLET" ? outlet.id : null, onboardingComplete: true,
      mustChangePassword: false, role: "PEMOHON",
    } });
    const auth = await loadAuthUser(user.id);
    assert(auth);
    const token = signToken(auth);
    const created = await request(app).post("/api/requests").set("Authorization", `Bearer ${token}`).send({
      type: "DANA", track: scenario.track, destination: scenario.destination,
      categoryId: scenario.opening ? openingCategory.id : scenario.destination === "OUTLET" ? outlet.id : category.id,
      title: `Uji alur ${scenario.role}`, purpose: "Verifikasi alur pencairan",
      bankName: "Bank Uji", bankAccountNumber: "123456", bankAccountHolder: user.name,
      items: [{ name: "Barang uji", quantity: 2, unit: "pcs", unitPrice: 10000 }], submit: true,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const row = created.body.data;
    assert.equal(row.status, scenario.direct ? "MENUNGGU_APPROVAL" : "MENUNGGU_MANAGER");
    assert.equal(row.totalAmount, 20000);
    if (scenario.direct) assert.equal(row.manager, null);
    else assert.equal(row.manager.nip, scenario.managerNip);
    assert.equal(row.disbursementOfficer.nip, scenario.officerNip);
    const manager = await person(scenario.managerNip);
    const officer = await person(scenario.officerNip);
    const premature = await request(app).post(`/api/approvals/${row.id}/disburse`).set("Authorization", `Bearer ${officer.token}`).field("amount", "20000");
    assert.equal(premature.status, 409, JSON.stringify(premature.body));
    const decisionToken = scenario.direct ? officer.token : manager.token;
    const approved = await request(app).post(`/api/approvals/${row.id}/approve`).set("Authorization", `Bearer ${decisionToken}`).send({ approvedAmount: 20000 });
    assert.equal(approved.status, 200, JSON.stringify(approved.body));
    assert.equal(approved.body.data.status, "DISETUJUI");
    const disbursed = await request(app).post(`/api/approvals/${row.id}/disburse`)
      .set("Authorization", `Bearer ${officer.token}`)
      .field("amount", "20000")
      .field("disbursementRef", `TEST-${nip}`)
      .attach("proof", Buffer.from("%PDF-1.4\n% workflow test\n"), { filename: "bukti-transfer.pdf", contentType: "application/pdf" });
    assert.equal(disbursed.status, 200, JSON.stringify(disbursed.body));
    assert.equal(disbursed.body.data.status, "DICAIRKAN");
    const dashboard = await request(app).get("/api/dashboard/summary?as=requester").set("Authorization", `Bearer ${token}`);
    assert.equal(dashboard.status, 200, JSON.stringify(dashboard.body));
    assert.equal(dashboard.body.data.cards.disbursedNominal, 20000);
    console.log(`${scenario.role} -> ${scenario.track}: ${scenario.direct ? "langsung" : `manager ${manager.user.nip}`}, pencairan ${officer.user.nip}, dashboard Rp20.000 OK`);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
