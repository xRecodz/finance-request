import { env } from "../config/env";
import { hashPassword } from "./auth";
import { prisma } from "./prisma";

export async function getDefaultPasswordHash() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "defaultPasswordHash" } });
  return setting?.value || hashPassword(env.DEFAULT_PASSWORD);
}
