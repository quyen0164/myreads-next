// ============================================================================
// FILE: components/UserMenu.tsx (Component Động - Chứa logic Đọc Cookie)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// Đây là Component chịu trách nhiệm hiển thị nút Đăng nhập / Đăng xuất / Quản trị.
// Ta tách nó ra khỏi Navbar để tránh lỗi "Blocking Route" của Next.js 16.
// ============================================================================

// [TỪ KHÓA: import { cookies } from "next/headers"]
// - Ý NGHĨA: Import hàm quản lý Cookie của Next.js.
// - TẠI SAO DÙNG: Đây là công cụ chuẩn để Server đọc "thẻ ra vào" (Cookie) do trình duyệt gửi lên.
import { cookies } from "next/headers";

// [TỪ KHÓA: import Link from "next/link"]
// - Ý NGHĨA: Component chuyển trang không load lại web.
// - TẠI SAO DÙNG: Để khi bấm vào nút "Quản trị" hay "Đăng nhập", trang không bị F5.
import Link from "next/link";

// Import Server Action Đăng xuất từ file auth.ts
import { logoutAction } from "@/app/actions/auth";

// [TỪ KHÓA: export default async function]
// - Ý NGHĨA: Khai báo hàm bất đồng bộ.
// - TẠI SAO DÙNG ASYNC: Vì bên trong ta phải dùng `await cookies()` (Next.js 15+ yêu cầu).
export default async function UserMenu() {
  
  // ==========================================================================
  // 1. LẤY DỮ LIỆU TỪ COOKIE
  // ==========================================================================
  // [TỪ KHÓA: await cookies()]
  // - Ý NGHĨA: Đợi Next.js lấy danh sách Cookie từ trình duyệt gửi lên.
  // - TẠI SAO DÙNG AWAIT: Nếu không có await, biến cookieStore sẽ là một Promise (lời hứa), không thể dùng hàm .get() được.
  const cookieStore = await cookies();
  
  // [TỪ KHÓA: .get("user_session")]
  // - Ý NGHĨA: Tìm Cookie có tên là "user_session" (đã được tạo lúc đăng nhập).
  const sessionCookie = cookieStore.get("user_session");

  // Biến kiểm tra quyền Admin. Mặc định là false (không phải admin).
  let isAdmin = false;

  // Nếu tìm thấy Cookie (tức là đã đăng nhập)
  if (sessionCookie) {
    try {
      // [TỪ KHÓA: JSON.parse()]
      // - Ý NGHĨA: Biến chuỗi JSON (từ cookie) thành Object trong JS.
      // - VD: Chuỗi '{"id":"1", "role":"ADMIN"}' -> Object { id: '1', role: 'ADMIN' }.
      const sessionData = JSON.parse(sessionCookie.value);
      
      // Nếu role trong cookie là ADMIN -> Bật cờ isAdmin lên true.
      if (sessionData.role === "ADMIN") {
        isAdmin = true;
      }
    } catch (error) {
      // [TỪ KHÓA: try...catch]
      // - Ý NGHĨA: Bọc code có thể gây lỗi. Nếu cookie bị hỏng (không phải JSON), chương trình không bị sập mà nhảy vào catch.
      isAdmin = false;
    }
  }

  // ==========================================================================
  // 2. GIAO DIỆN
  // ==========================================================================
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
      
      {/* [TỪ KHÓA: Toán tử 3 ngôi (Điều kiện ? Đúng : Sai)] */}
      {sessionCookie ? (
        // --- TRƯỜNG HỢP 1: ĐÃ CÓ COOKIE (ĐÃ ĐĂNG NHẬP) ---
        <>
          {/* Nếu là ADMIN, hiện nút Quản trị */}
          {isAdmin && (
            <Link href="/admin" style={{ textDecoration: "none", color: "#2563eb", fontWeight: "bold", padding: "8px 16px", backgroundColor: "#eff6ff", borderRadius: "8px" }}>
              ⚙️ Quản trị
            </Link>
          )}

          {/* [TỪ KHÓA: <form action={logoutAction}>]
              - Ý NGHĨA: Gắn Server Action vào form. Khi submit, Next.js sẽ tự động gửi request lên Server để chạy hàm logoutAction.
              - TẠI SAO DÙNG: Không cần dùng onClick hay fetch API. Code cực kỳ gọn. */}
          <form action={logoutAction}>
            <button type="submit" style={{ background: "none", border: "1px solid #ef4444", color: "#ef4444", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
              Đăng xuất
            </button>
          </form>
        </>
      ) : (
        // --- TRƯỜNG HỢP 2: CHƯA ĐĂNG NHẬP ---
        <Link href="/login" style={{ textDecoration: "none", color: "white", fontWeight: "bold", padding: "8px 20px", backgroundColor: "#2563eb", borderRadius: "8px" }}>
          Đăng nhập
        </Link>
      )}
    </div>
  );
}