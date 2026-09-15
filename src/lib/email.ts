import { createRequire } from "module";
import { env } from "../config/env";

const nodeRequire = createRequire(__filename);

type MailTransporter = {
  sendMail: (options: {
    from?: string;
    to: string;
    subject: string;
    text: string;
  }) => Promise<unknown>;
};

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_FROM && env.SMTP_USER && env.SMTP_PASS);
}

let transporter: MailTransporter | null = null;

function getTransporter(): MailTransporter | null {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    try {
      // Paket opsional — install dengan: npm install nodemailer
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodemailer = nodeRequire("nodemailer") as {
        createTransport: (options: unknown) => MailTransporter;
      };
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE === "true",
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } catch {
      console.warn(
        "nodemailer belum terpasang — email notifikasi dinonaktifkan. Jalankan: npm install"
      );
      return null;
    }
  }
  return transporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const tx = getTransporter();
  if (!tx) return;
  await tx.sendMail({
    from: env.SMTP_FROM,
    to: params.to,
    subject: params.subject,
    text: params.text,
  });
}
