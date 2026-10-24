// prisma/seed.ts
import { PrismaClient } from '../generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// 1. Tạo một adapter cho SQLite, trỏ đến file database của bạn
const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db' // Đường dẫn này khớp với file dev.db bạn đã tạo
});

// 2. Khởi tạo Prisma Client và truyền adapter vào
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("⏳ Bắt đầu tạo dữ liệu mẫu...");

  // 1. TẠO TÁC GIẢ (AUTHOR)
  const author1 = await prisma.author.create({
    data: { name: "Robert C. Martin" }
  });
  
  const author2 = await prisma.author.create({
    data: { name: "J.K. Rowling" }
  });

  // 2. TẠO NGƯỜI DÙNG (USER)
  const user1 = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Quản trị viên",
      role: "ADMIN",
    }
  });

  // 3. TẠO SÁCH VÀ LIÊN KẾT QUAN HỆ (BOOK)
  await prisma.book.create({
    data: {
      title: "Clean Code",
      shelf: "READ",
      userId: user1.id, 
      authors: {
        connect: [{ id: author1.id }] 
      }
    }
  });

  await prisma.book.create({
    data: {
      title: "Harry Potter",
      shelf: "CURRENTLY_READING",
      userId: user1.id,
      authors: {
        connect: [{ id: author2.id }]
      }
    }
  });

  console.log("✅ Đã tạo xong dữ liệu mẫu!");
}

// Thực thi hàm main và xử lý lỗi
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect(); // Đóng kết nối sau khi chạy xong
  });