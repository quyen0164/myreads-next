// lib/prisma.ts
import { PrismaClient } from '../generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Khởi tạo adapter cho SQLite
const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db'
});

// [MẸO NEXT.JS]: Lưu PrismaClient vào biến toàn cục (global) để tránh việc 
// Next.js tạo lại kết nối mới mỗi khi bạn sửa code (Hot Reload).
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;