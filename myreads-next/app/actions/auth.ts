// ============================================================================
// FILE: app/actions/auth.ts (Xử lý Đăng nhập / Đăng xuất)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// File này chứa các "Server Actions" dùng để xác thực người dùng (Authentication).
// Nó chịu trách nhiệm kiểm tra xem email có tồn tại trong Database không.
// Nếu có, nó sẽ tạo một "thẻ ra vào" (Cookie) để ghi nhớ phiên đăng nhập.
//
// [TÁC DỤNG]:
// - Hàm loginAction: Nhận email, kiểm tra DB, tạo Cookie chứa ID và Role.
//   + [ĐÃ SỬA]: Phân luồng chuyển hướng - Admin vào /admin, User thường về trang chủ (/).
// - Hàm logoutAction: Xóa Cookie và chuyển hướng về trang chủ.
//
// [TẠI SAO DÙNG COOKIE MÀ KHÔNG DÙNG LOCALSTORAGE?]:
// - Cookie: Lưu ở trình duyệt nhưng Server có thể đọc được (thông qua request). Bảo mật cao (nếu bật httpOnly).
// - LocalStorage: Chỉ lưu ở Client, Server không đọc được. Dễ bị tấn công XSS (kẻ xấu chèn mã độc lấy cắp token).
// - CÁCH KHÁC (Chuyên nghiệp hơn): Dùng thư viện NextAuth.js hoặc iron-session để mã hóa Cookie. Nhưng ở mức độ học tập, ta tự code bằng Cookie cơ bản.
// ============================================================================

// [TỪ KHÓA: "use server"]
// - Ý NGHĨA: Chỉ thị bắt buộc của Next.js.
// - TÁC DỤNG: Đảm bảo file này chỉ chạy trên Server, không bao giờ bị gửi xuống trình duyệt của người dùng.
"use server";

// [TỪ KHÓA: import { cookies } from "next/headers"]
// - Ý NGHĨA: Import hàm quản lý Cookie của Next.js.
// - TẠI SAO DÙNG: Đây là công cụ chuẩn của Next.js để đọc/ghi Cookie ở phía Server.
import { cookies } from "next/headers";

// [TỪ KHÓA: import { redirect } from "next/navigation"]
// - Ý NGHĨA: Import hàm chuyển hướng trang.
// - TẠI SAO DÙNG: Để đá người dùng sang trang tương ứng sau khi đăng nhập thành công, hoặc về trang chủ khi đăng xuất.
import { redirect } from "next/navigation";

// Import đối tượng kết nối Database để kiểm tra email.
import { db } from "@/lib/db";

// ============================================================================
// HÀM 1: ĐĂNG NHẬP (LOGIN)
// ============================================================================
// [TỪ KHÓA: export async function]
// - Ý NGHĨA: Khai báo một hàm bất đồng bộ và xuất khẩu nó để file khác dùng.
// - TẠI SAO DÙNG ASYNC: Vì từ Next.js 15, hàm cookies() là bất đồng bộ, cần dùng await bên trong.
export async function loginAction(formData: FormData) {
  // 1. LẤY DỮ LIỆU TỪ FORM
  // [TỪ KHÓA: formData.get("email")]
  // - Ý NGHĨA: Lấy giá trị của ô input có thuộc tính name="email".
  // - [TỪ KHÓA: as string]: Ép kiểu dữ liệu để TypeScript hiểu đây là chuỗi.
  const email = formData.get("email") as string;

  // 2. KIỂM TRA DỮ LIỆU ĐẦU VÀO
  if (!email) {
    // [TỪ KHÓA: throw new Error()]
    // - Ý NGHĨA: Ném lỗi và dừng hàm ngay lập tức.
    // - TẠI SAO DÙNG: Để Frontend bắt được lỗi này và hiển thị thông báo cho người dùng.
    throw new Error("Vui lòng nhập email.");
  }

  // 3. TRUY VẤN DATABASE
  // [TỪ KHÓA: db.prepare().get()]
  // - Ý NGHĨA: Chuẩn bị câu lệnh SQL và lấy RA DUY NHẤT 1 dòng dữ liệu khớp với email.
  // - TẠI SAO DÙNG .get(): Vì email là duy nhất (UNIQUE trong DB), nên chỉ có tối đa 1 kết quả.
  const user = db.prepare(`SELECT id, name, role FROM users WHERE email = ?`)
    .get(email) as { id: string; name: string; role: string } | undefined;

  // 4. XỬ LÝ KHI KHÔNG TÌM THẤY USER
  if (!user) {
    throw new Error("Email này không tồn tại trong hệ thống.");
  }

  // ==========================================================================
  // 5. TẠO COOKIE (THẺ RA VÀO)
  // ==========================================================================
  // [TỪ KHÓA: await cookies()]
  // - Ý NGHĨA: Gọi hàm cookies() và CHỜ nó trả về đối tượng quản lý cookie (cookieStore).
  // - LƯU Ý: Ở Next.js 15+, cookies() trả về một Promise. Nếu không có await sẽ bị lỗi.
  const cookieStore = await cookies();
  
  // [TỪ KHÓA: cookieStore.set()]
  // - Ý NGHĨA: Tạo một Cookie mới trên trình duyệt của người dùng.
  cookieStore.set("user_session", JSON.stringify({ id: user.id, role: user.role }), {
    // [TỪ KHÓA: httpOnly: true]
    // - Ý NGHĨA: Bảo mật Cookie, ngăn JavaScript ở Client đọc nó (chống XSS).
    httpOnly: true, 
    
    // [TỪ KHÓA: secure]
    // - Ý NGHĨA: Chỉ gửi Cookie qua kết nối HTTPS. Ở môi trường dev (localhost), nó sẽ là false.
    secure: process.env.NODE_ENV === "production", 
    
    // [TỪ KHÓA: maxAge]
    // - Ý NGHĨA: Thời gian sống của Cookie (tính bằng giây). Ở đây là 7 ngày.
    maxAge: 60 * 60 * 24 * 7, 
    
    // [TỪ KHÓA: path: "/"]
    // - Ý NGHĨA: Cookie có hiệu lực trên toàn bộ các trang của website (từ trang chủ đến admin).
    path: "/", 
  });

  // ==========================================================================
  // 6. CHUYỂN HƯỚNG (ĐÃ SỬA LỖI PHÂN QUYỀN)
  // ==========================================================================
  // [LỖI TRƯỚC ĐÂY]: Luôn redirect("/admin") cho mọi user, khiến user thường bị đá vào trang Admin.
  // [CÁCH SỬA]: Kiểm tra role. Nếu là ADMIN thì vào /admin, ngược lại (USER) thì về trang chủ (/).
  if (user.role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/");
  }
}

// ============================================================================
// HÀM 2: ĐĂNG XUẤT (LOGOUT)
// ============================================================================
export async function logoutAction() {
  // [TỪ KHÓA: await cookies()]
  // - Ý NGHĨA: Tương tự như trên, phải await để lấy được cookieStore.
  const cookieStore = await cookies();
  
  // [TỪ KHÓA: cookieStore.delete()]
  // - Ý NGHĨA: Xóa Cookie "user_session" khỏi trình duyệt.
  // - TÁC DỤNG: Người dùng lập tức mất "thẻ ra vào", Middleware sẽ chặn không cho họ vào trang Admin nữa.
  cookieStore.delete("user_session");
  
  // Chuyển hướng về trang chủ
  redirect("/");
}