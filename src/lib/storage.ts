import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AttachmentKind } from "@prisma/client";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { env, isR2Configured } from "../config/env";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 belum dikonfigurasi. Isi R2_* di file .env terlebih dahulu."
    );
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return client;
}

export function getBucketForKind(kind: AttachmentKind): string {
  if (!isR2Configured()) {
    return "local";
  }
  switch (kind) {
    case AttachmentKind.BUKTI_LPJ:
      return env.R2_BUCKET_LPJ;
    case AttachmentKind.BUKTI_TRANSFER:
      return env.R2_BUCKET_TRANSFER;
    default:
      return env.R2_BUCKET_DOCUMENT;
  }
}

export function buildObjectKey(params: {
  kind: AttachmentKind;
  requestNumber: string;
  originalFilename: string;
}): string {
  const safeNumber = params.requestNumber.replace(/[^A-Za-z0-9]+/g, "-");
  const ext = params.originalFilename.includes(".")
    ? `.${params.originalFilename.split(".").pop()!.toLowerCase()}`
    : "";
  const folder = params.kind.toLowerCase();
  return `${folder}/${safeNumber}/${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
}

async function uploadLocal(params: {
  key: string;
  body: Buffer;
}): Promise<void> {
  const full = path.resolve(process.cwd(), "uploads", params.key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, params.body);
}

export async function uploadToR2(params: {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  if (!isR2Configured()) {
    await uploadLocal({ key: params.key, body: params.body });
    return;
  }
  await getClient().send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}

export async function deleteFromR2(bucket: string, key: string): Promise<void> {
  if (!isR2Configured()) {
    await fs.unlink(path.resolve(process.cwd(), "uploads", key)).catch(() => undefined);
    return;
  }
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getPreviewUrl(
  bucket: string,
  key: string,
  mimeType: string
): Promise<string> {
  if (!isR2Configured()) {
    return `/uploads/${key}`;
  }
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentType: mimeType }),
    { expiresIn: env.DOWNLOAD_URL_EXPIRES_SECONDS }
  );
}

export async function getDownloadUrl(
  bucket: string,
  key: string,
  originalFilename: string
): Promise<string> {
  if (!isR2Configured()) {
    return `/uploads/${key}`;
  }
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${originalFilename.replace(/"/g, "")}"`,
    }),
    { expiresIn: env.DOWNLOAD_URL_EXPIRES_SECONDS }
  );
}

export { isR2Configured };
