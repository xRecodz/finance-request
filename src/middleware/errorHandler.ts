import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Endpoint tidak ditemukan" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Data yang dikirim tidak valid",
      fields: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Ukuran file melebihi batas yang diizinkan"
        : `Upload gagal: ${err.message}`;
    res.status(400).json({ error: message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "Data sudah ada (duplikat)" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "Data tidak ditemukan" });
      return;
    }
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Terjadi kesalahan pada server" });
}

/** Pembungkus async handler agar error otomatis diteruskan ke errorHandler. */
export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req as T, res, next).catch(next);
  };
}
