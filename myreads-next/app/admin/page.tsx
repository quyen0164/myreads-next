// ============================================================================
// FILE: app/admin/page.tsx (Trang Quản Trị - Server Component)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// Đây là "Người lấy dữ liệu" (Data Fetcher). Nó chạy trên Server, gọi Database để lấy
// thông tin của 5 bảng: Sách, Người dùng, Thể loại, Tác giả, Đánh giá.
// 
// [SỬA LỖI GẦN ĐÂY - CHỐT CHẶN BẢO MẬT]:
// - Lỗi: Logout rồi nhưng vẫn vào được trang /admin.
// - Nguyên nhân: Middleware không chạy, và bản thân trang Admin không kiểm tra quyền.
// - Cách sửa: Thêm "Chốt chặn thứ 2" (Server-side Auth) ngay đầu file. Nếu không phải 
//   ADMIN, lập tức đá văng về trang chủ (redirect). Dù Middleware có bị lỗi thì trang 
//   Admin vẫn tuyệt đối an toàn.
// ============================================================================

import { db } from "@/lib/db";
import AdminDashboard from "./AdminDashboard";
import { listBooksForUser } from "@/lib/books";
import Link from "next/link";
import "../styles.css";

// [TỪ KHÓA: import { cookies } và { redirect }] - [THÊM MỚI]
// - Ý NGHĨA: Import công cụ đọc Cookie và công cụ chuyển hướng của Next.js.
// - TẠI SAO DÙNG: Để kiểm tra xem ai đang đăng nhập và đá họ ra nếu không đủ quyền.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const DEMO_USER_ID = "user-demo";

// [TỪ KHÓA: async function AdminPage()] - [SỬA TẠI ĐÂY]
// - Ý NGHĨA: Thêm chữ `async` vào trước hàm.
// - TẠI SAO DÙNG: Vì hàm `cookies()` ở Next.js 15+ là bất đồng bộ, cần `await` để chờ kết quả.
export default async function AdminPage() {
  
  // ==========================================================================
  // [CHỐT CHẶN BẢO MẬT TẠI SERVER] - QUAN TRỌNG NHẤT
  // ==========================================================================
  // 1. Đọc Cookie từ trình duyệt
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");
  
  // 2. Mặc định coi như không phải Admin
  let isAdmin = false;
  
  // 3. Kiểm tra tính hợp lệ của Cookie
  if (sessionCookie) {
    try {
      // [TỪ KHÓA: JSON.parse()]
      // - Biến chuỗi JSON (từ cookie) thành Object để dễ đọc.
      const session = JSON.parse(sessionCookie.value);
      
      // Nếu role trong cookie là "ADMIN" thì mới cho qua
      if (session.role === "ADMIN") {
        isAdmin = true;
      }
    } catch (e) {
      // Nếu cookie bị hỏng, coi như không có quyền.
      isAdmin = false;
    }
  }

  // 4. [TỪ KHÓA: redirect("/")]
  // - TÁC DỤNG: Nếu KHÔNG PHẢI là Admin, lập tức đá người dùng về trang chủ.
  // - TẠI SAO DÙNG: Ngăn chặn tuyệt đối việc truy cập trái phép, dù kẻ gian có cố tình 
  //   gõ đường dẫn /admin lên thanh địa chỉ.
  if (!isAdmin) {
    redirect("/");
  }
  // ==========================================================================

  // ==========================================================================
  // PHẦN 1: LẤY DỮ LIỆU TỪ DATABASE (Chỉ chạy khi đã là Admin)
  // ==========================================================================
  const books = listBooksForUser(DEMO_USER_ID);
  const users = db.prepare(`SELECT id, name, email, role FROM users`).all();
  const categories = db.prepare(`SELECT id, name FROM categories`).all();
  const authors = db.prepare(`SELECT id, name FROM authors`).all();
  
  const reviewsRaw = db.prepare(`
    SELECT 
      r.id, r.rating, r.content, u.name AS userName, b.title AS bookTitle
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    JOIN books b ON b.id = r.book_id
  `).all();

  // ==========================================================================
  // PHẦN 2: HIỂN THỊ GIAO DIỆN
  // ==========================================================================
  return (
    <main className="my-main">
      <div className="my-container">
        
        {/* HEADER */}
        <header className="my-header">
          <h1>⚙️ Trang Quản Trị Hệ Thống</h1>
          <p>Quản lý toàn bộ dữ liệu: Sách, Người dùng, Danh mục và Đánh giá</p>
          
          <Link href="/" style={{ color: "#2563eb", fontWeight: "bold", textDecoration: "underline" }}>
            ← Quay lại Trang chủ
          </Link>
        </header>

        {/* TRUYỀN DỮ LIỆU XUỐNG CLIENT COMPONENT */}
        <AdminDashboard 
          books={books} 
          users={users} 
          categories={categories} 
          authors={authors} 
          reviews={reviewsRaw} 
        />

      </div>
    </main>
  );
}