import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3100),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("SL INDONESIA"),
  APP_TIMEZONE: z.string().default("Asia/Jakarta"),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("1d"),

  DEFAULT_PASSWORD: z.string().min(4).default("100100"),
  MIN_PASSWORD_LENGTH: z.coerce.number().int().min(4).default(6),

  LPJ_DUE_DAYS: z.coerce.number().int().positive().default(14),
  REQUEST_NUMBER_PREFIX: z.string().default("SLI/FIN"),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_BUCKET_DOCUMENT: z.string().default("finance-dokumen"),
  R2_BUCKET_LPJ: z.string().default("finance-lpj"),
  R2_BUCKET_TRANSFER: z.string().default("finance-transfer"),

  DOWNLOAD_URL_EXPIRES_SECONDS: z.coerce.number().int().positive().default(3600),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(26214400),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Environment tidak valid:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export function isR2Configured(): boolean {
  return Boolean(
    env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_ENDPOINT &&
      !env.R2_ACCESS_KEY_ID.startsWith("your_") &&
      !env.R2_ENDPOINT.includes("<ACCOUNT_ID>")
  );
}
