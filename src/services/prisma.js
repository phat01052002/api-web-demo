import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Logging with middleware
 */
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  // log here
  // console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
  // console.log(params);
  return result;
});

export { prisma };