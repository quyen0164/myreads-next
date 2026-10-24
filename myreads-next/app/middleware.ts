// ============================================================================
// FILE: middleware.ts (Chốt bảo vệ toàn hệ thống)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// Middleware là một đoạn code chạy "chen ngang" trước khi một request được xử lý.
// Nó chạy trên Edge Runtime (rất nhanh, không tốn tài nguyên Server Node.js).
//
// [TÁC DỤNG]:
// - Chặn tất cả các truy cập vào đường dẫn `/admin` nếu chưa đăng nhập.
// - Nếu đã đăng nhập nhưng không phải là ADMIN, cũng chặn lại.
// - Chuyển hướng người dùng về `/login` nếu vi phạm.
//
// [TẠI SAO KHÔNG DÙNG CÁCH KHÁC]:
// - CÁCH KHÁC: Viết code kiểm tra trong từng file page.tsx. Nhược điểm: Bạn phải copy đoạn code kiểm tra đó vào mọi trang Admin. Nếu quên 1 trang là lỗ hổng bảo mật ngay.
// - DÙNG MIDDLEWARE: Chỉ cần viết 1 lần ở đây, nó tự động bảo vệ toàn bộ hệ thống.
// ============================================================================

// [TỪ KHÓA: import { NextResponse } và { NextRequest }]
// - Ý NGHĨA: Import các class của Next.js để đọc Request và tạo Response.
// - TẠI SAO DÙNG: `NextRequest` giúp đọc Cookie, URL. `NextResponse` giúp trả về lệnh chuyển hướng hoặc cho đi tiếp.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // 1. LẤY COOKIE TỪ TRÌNH DUYỆT
  // [TỪ KHÓA: request.cookies.get("user_session")]
  // - Ý NGHĨA: Tìm xem trình duyệt có gửi kèm Cookie tên là "user_session" không.
  // - TẠI SAO DÙNG: Đây là "thẻ ra vào" mà chúng ta đã tạo ở hàm `loginAction`.
  const sessionCookie = request.cookies.get("user_session");

  // 2. KHỞI TẠO BIẾN KIỂM TRA
  // Mặc định coi như chưa đăng nhập.
  let isAdmin = false;

  // 3. KIỂM TRA TÍNH HỢP LỆ CỦA COOKIE
  if (sessionCookie) {
    try {
      // [TỪ KHÓA: JSON.parse()]
      // - Ý NGHĨA: Biến chuỗi JSON (từ cookie) thành Object trong JavaScript.
      // - VD: Chuỗi '{"id":"1","role":"ADMIN"}' -> Object { id: '1', role: 'ADMIN' }.
      const session = JSON.parse(sessionCookie.value);
      
      // Kiểm tra xem role có phải là ADMIN không.
      if (session.role === "ADMIN") {
        isAdmin = true;
      }
    } catch (error) {
      // Nếu cookie bị hỏng (không phải JSON), bỏ qua và coi như không đăng nhập.
      isAdmin = false;
    }
  }

  // 4. LOGIC CHẶN (GATEKEEPER)
  // [TỪ KHÓA: request.nextUrl.pathname]
  // - Ý NGHĨA: Lấy đường dẫn hiện tại mà người dùng đang muốn truy cập.
  const isTryingToAccessAdmin = request.nextUrl.pathname.startsWith("/admin");

  // Nếu đang muốn vào trang Admin MÀ KHÔNG PHẢI Admin
  if (isTryingToAccessAdmin && !isAdmin) {
    // [TỪ KHÓA: NextResponse.redirect()]
    // - Ý NGHĨA: Trả về lệnh chuyển hướng (HTTP 307).
    // - new URL("/login", request.url): Tạo đường dẫn tuyệt đối tới trang đăng nhập.
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Nếu đã đăng nhập thành công, hoặc đang truy cập trang công khai (như trang chủ)
  // [TỪ KHÓA: NextResponse.next()]
  // - Ý NGHĨA: "Cho phép đi tiếp" (Bỏ qua bảo vệ). Request sẽ được xử lý bình thường.
  return NextResponse.next();
}

// ============================================================================
// PHẦN CẤU HÌNH (MATCHER)
// ============================================================================
// [TỪ KHÓA: export const config]
// - Ý NGHĨA: Cấu hình cho Middleware biết nó nên chạy ở những đường dẫn nào.
// - TẠI SAO DÙNG: Ta không muốn Middleware chạy ở mọi trang (sẽ làm chậm web). 
// Ta chỉ cần nó bảo vệ các trang bắt đầu bằng `/admin`.
// TỪ KHÓA: matcher: Danh sách các đường dẫn cần chạy Middleware.
export const config = {
  matcher: ["/admin/:path*"], // Dấu :path* có nghĩa là mọi đường dẫn con của /admin.
};