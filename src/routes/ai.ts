import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth, requirePasswordChanged, requireRoles } from "../middleware/auth";
import { HttpError, asyncHandler } from "../middleware/errorHandler";

export const aiRouter = Router();
aiRouter.use(requireAuth, requirePasswordChanged, requireRoles(UserRole.IT, UserRole.ADMIN));
aiRouter.get("/status", (_req, res) => res.json({ data: { configured: Boolean(env.AI_PROVIDER && env.AI_API_KEY && env.AI_MODEL && (env.AI_PROVIDER === "gemini" || env.AI_API_URL)), provider: env.AI_PROVIDER || null } }));

aiRouter.post("/chat", asyncHandler<AuthedRequest>(async (req, res) => {
  const body = z.object({ message: z.string().trim().min(1).max(3000), history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(3000) })).max(8).default([]) }).parse(req.body);
  if (!env.AI_PROVIDER || !env.AI_API_KEY || !env.AI_MODEL || (env.AI_PROVIDER === "9router" && !env.AI_API_URL)) {
    throw new HttpError(503, "AI belum dikonfigurasi. Isi AI_PROVIDER, AI_API_KEY, AI_MODEL, dan AI_API_URL untuk 9Router di server.");
  }
  const [users, pendingManager, pendingPayout, missingProfile] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.request.count({ where: { status: "MENUNGGU_MANAGER" } }),
    prisma.request.count({ where: { status: "DISETUJUI" } }),
    prisma.user.count({ where: { isActive: true, onboardingComplete: false } }),
  ]);
  const system = `Anda asisten Portal IT sistem pengajuan SL Indonesia. Jawab dalam Bahasa Indonesia. Hanya bantu analisis dan panduan. Jangan mengklaim telah mengubah database, mengubah role, approval, atau pencairan. Minta pengguna memakai halaman Routing & Password atau Kelola User untuk perubahan. Jangan meminta password, token, atau nomor rekening lengkap. Ringkasan saat ini: ${users} user aktif, ${missingProfile} belum selesai profil awal, ${pendingManager} menunggu manager, ${pendingPayout} menunggu pencairan. Data ini adalah agregat, bukan daftar lengkap.`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    let response: Response;
    if (env.AI_PROVIDER === "gemini") {
      response = await fetch(env.AI_API_URL || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.AI_MODEL)}:generateContent`, {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.AI_API_KEY },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [...body.history.map(item => ({ role: item.role === "assistant" ? "model" : "user", parts: [{ text: item.text }] })), { role: "user", parts: [{ text: body.message }] }] }),
      });
    } else {
      response = await fetch(env.AI_API_URL!, { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.AI_API_KEY}` }, body: JSON.stringify({ model: env.AI_MODEL, messages: [{ role: "system", content: system }, ...body.history.map(item => ({ role: item.role, content: item.text })), { role: "user", content: body.message }] }) });
    }
    if (!response.ok) throw new HttpError(502, `Penyedia AI mengembalikan HTTP ${response.status}`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; choices?: Array<{ message?: { content?: string } }> };
    const answer = env.AI_PROVIDER === "gemini" ? payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("\n") : payload.choices?.[0]?.message?.content;
    if (!answer) throw new HttpError(502, "Penyedia AI tidak mengembalikan jawaban teks");
    res.json({ data: { answer } });
  } finally { clearTimeout(timer); }
}));
