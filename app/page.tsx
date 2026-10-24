// app/page.tsx
import { prisma } from '../lib/prisma';

// [SERVER COMPONENT]: Hàm này chạy trên Server. Ta có thể dùng async/await trực tiếp.
export default async function Home() {
  // Gọi Database để lấy sách. Dùng "include" để lấy kèm thông tin bảng liên quan.
  const books = await prisma.book.findMany({
    include: {
      user: true,    // Lấy thông tin người sở hữu (Quan hệ 1-N)
      authors: true, // Lấy danh sách tác giả (Quan hệ N-N)
    },
  });

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ color: "#2563eb" }}>📚 Tủ Sách Của Tôi</h1>
      <p style={{ color: "#64748b" }}>Dữ liệu được lấy trực tiếp từ SQLite qua Prisma (Server Component)</p>
      
      <div style={{ display: "grid", gap: "20px", marginTop: "30px" }}>
        {books.map((book) => (
          <div key={book.id} style={{ border: "1px solid #e2e8f0", padding: "20px", borderRadius: "10px", background: "#f8fafc" }}>
            <h2 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>{book.title}</h2>
            
            {/* Hiển thị quan hệ N-N (Nhiều tác giả) */}
            <p style={{ margin: "5px 0" }}>
              ✍️ <strong>Tác giả:</strong> {book.authors.map(a => a.name).join(", ")}
            </p>
            
            {/* Hiển thị quan hệ 1-N (Thuộc về User nào) */}
            <p style={{ margin: "5px 0" }}>
              👤 <strong>Chủ sở hữu:</strong> {book.user.name} ({book.user.email})
            </p>
            
            <p style={{ margin: "10px 0 0 0" }}>
              📌 <strong>Kệ:</strong> <span style={{ background: "#dbeafe", color: "#1e40af", padding: "3px 10px", borderRadius: "20px", fontSize: "14px" }}>{book.shelf}</span>
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}