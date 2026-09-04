import { prisma } from '../db.js';

export async function audit(userId, action, metadata = {}) {
  const safe = { ...metadata };
  delete safe.password;
  delete safe.passwordHash;
  delete safe.rawPayload;
  return prisma.auditLog.create({
    data: { userId, action, metadata: safe }
  });
}
