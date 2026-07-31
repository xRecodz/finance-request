import { Router } from "express";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../lib/prisma";
import { getDownloadUrl, getPreviewUrl, isR2Configured } from "../lib/storage";
import { AuthedRequest, requireAuth, requirePasswordChanged } from "../middleware/auth";
import { HttpError, asyncHandler } from "../middleware/errorHandler";
import { UserRole } from "@prisma/client";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env";

export const attachmentsRouter = Router();

attachmentsRouter.use(requireAuth, requirePasswordChanged);

async function assertCanViewAttachment(attachmentId: string, user: AuthedRequest["user"]) {
  const file = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      request: { select: { id: true, requesterId: true, approverId: true } },
      lpj: {
        include: {
          request: { select: { id: true, requesterId: true, approverId: true } },
        },
      },
    },
  });
  if (!file) throw new HttpError(404, "Lampiran tidak ditemukan");

  const reqMeta = file.request || file.lpj?.request;
  if (!reqMeta) throw new HttpError(404, "Lampiran tidak terhubung ke pengajuan");

  if (
    user!.role !== UserRole.ADMIN &&
    reqMeta.requesterId !== user!.id &&
    reqMeta.approverId !== user!.id
  ) {
    throw new HttpError(403, "Anda tidak berhak melihat lampiran ini");
  }

  return file;
}

/** Metadata + URL preview/download (untuk daftar lampiran di UI). */
attachmentsRouter.get(
  "/:id",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const file = await assertCanViewAttachment(req.params.id, req.user);
    const previewUrl = isR2Configured()
      ? await getPreviewUrl(file.bucket, file.objectKey, file.mimeType)
      : `/uploads/${file.objectKey}`;
    const downloadUrl = isR2Configured()
      ? await getDownloadUrl(file.bucket, file.objectKey, file.originalFilename)
      : `/uploads/${file.objectKey}`;

    res.json({
      data: {
        id: file.id,
        kind: file.kind,
        originalFilename: file.originalFilename,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        previewUrl,
        downloadUrl,
      },
    });
  })
);

/**
 * Stream file dengan auth (agar <iframe>/<img> bisa pakai blob URL dari frontend).
 * Query ?download=1 memaksa attachment disposition.
 */
attachmentsRouter.get(
  "/:id/file",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const file = await assertCanViewAttachment(req.params.id, req.user);
    const asDownload = req.query.download === "1";

    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `${asDownload ? "attachment" : "inline"}; filename="${file.originalFilename.replace(/"/g, "")}"`
    );
    res.setHeader("Cache-Control", "private, max-age=300");

    if (!isR2Configured() || file.bucket === "local") {
      const full = path.resolve(process.cwd(), "uploads", file.objectKey);
      if (!existsSync(full)) throw new HttpError(404, "File tidak ada di server");
      createReadStream(full).pipe(res);
      return;
    }

    const client = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });

    const obj = await client.send(
      new GetObjectCommand({ Bucket: file.bucket, Key: file.objectKey })
    );
    const body = obj.Body;
    if (!body) throw new HttpError(404, "File kosong");

    // @aws-sdk stream → Node readable
    const stream = body as NodeJS.ReadableStream;
    stream.pipe(res);
  })
);
