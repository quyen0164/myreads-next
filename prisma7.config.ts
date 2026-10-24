// prisma7.config.ts
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  
  // THÊM ĐOẠN NÀY VÀO:
  migrations: {
    seed: 'tsx ./prisma/seed.ts',
  },
  
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});