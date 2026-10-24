// ============================================================================
// FILE: app/login/page.tsx (Trang Đăng Nhập)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// Đây là giao diện để người dùng nhập Email và đăng nhập vào hệ thống.
// 
// [TÁC DỤNG]:
// - Hiển thị form nhập email.
// - Gửi dữ liệu lên Server Action `loginAction` (đã viết ở file trước).
// - Bắt lỗi nếu email không tồn tại và hiển thị thông báo màu đỏ.
// ============================================================================

// [TỪ KHÓA: "use client"]
// - Ý NGHĨA: Báo Next.js đây là Client Component.
// - TẠI SAO DÙNG: Vì ta cần dùng useState để quản lý lỗi, và cần dùng try/catch để bắt lỗi từ Server Action trả về.
"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions/auth";
import Link from "next/link";
import "../styles.css";

export default function LoginPage() {
  // [STATE 1]: Lưu thông báo lỗi. Mặc định là chuỗi rỗng.
  const [errorMsg, setErrorMsg] = useState("");
  
  // [STATE 2]: Lưu trạng thái đang tải (để hiện chữ "Đang xử lý..." và khóa nút bấm).
  const [isLoading, setIsLoading] = useState(false);

  // [HÀM: handleSubmit]
  // - Ý NGHĨA: Chạy khi người dùng bấm nút Đăng nhập.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // [TỪ KHÓA: e.preventDefault()]
    // - Ý NGHĨA: Chặn trình duyệt tự động tải lại trang (F5) khi submit form. 
    // - TẠI SAO DÙNG: Vì Next.js là Single Page Application, tải lại trang sẽ làm mất toàn bộ dữ liệu và trạng thái.
    e.preventDefault();
    
    setIsLoading(true);
    setErrorMsg("");

    // [TỪ KHÓA: new FormData(e.currentTarget)]
    // - Ý NGHĨA: Lấy toàn bộ dữ liệu từ thẻ <form> hiện tại (bao gồm thẻ input có name="email").
    const formData = new FormData(e.currentTarget);

    try {
      // Gọi Server Action
      await loginAction(formData);
    } catch (error: any) {
      // [TỪ KHÓA: error.digest]
      // - Ý NGHĨA: Khi Server Action gọi `redirect()`, Next.js sẽ ném ra một lỗi đặc biệt có mã là 'NEXT_REDIRECT'.
      // - TẠI SAO KIỂM TRA: Ta không muốn hiển thị lỗi chuyển trang cho người dùng. Nếu là lỗi chuyển trang, ta phải ném lỗi đó ra ngoài để Next.js thực hiện việc chuyển hướng.
      if (error.digest === "NEXT_REDIRECT") {
        throw error; 
      }
      
      // Nếu là lỗi thật (VD: "Email không tồn tại"), ta hiển thị thông báo đỏ.
      setErrorMsg(error.message || "Đã xảy ra lỗi khi đăng nhập.");
    } finally {
      // [TỪ KHÓA: finally]
      // - Ý NGHĨA: Luôn chạy khối này dù thành công hay thất bại. Tắt trạng thái loading.
      setIsLoading(false);
    }
  };

  return (
    // [TỪ KHÓA: style nền tảng]
    // - TẠO GIAO DIỆN ĐẸP: Dùng flexbox để căn giữa form vào giữa màn hình.
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f6f8fb 0%, #e9eef5 100%)" }}>
      
      {/* KHUNG FORM ĐĂNG NHẬP */}
      <div style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", width: "100%", maxWidth: "400px" }}>
        
        <h1 style={{ textAlign: "center", color: "#1e3a8a", marginBottom: "30px", fontSize: "28px" }}>Đăng Nhập</h1>

        {/* [TỪ KHÓA: onSubmit]
            - Ý NGHĨA: Gắn hàm handleSubmit vào sự kiện submit của form.
            - TẠI SAO KHÔNG DÙNG action={loginAction} TRỰC TIẾP: 
              Vì nếu dùng action trực tiếp, khi có lỗi (throw Error), Next.js sẽ hiển thị toàn màn hình lỗi (error boundary). 
              Dùng onSubmit kết hợp try/catch giúp ta hiển thị lỗi một cách nhẹ nhàng (chữ đỏ dưới ô input). */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Email</label>
            <input 
              type="email" 
              name="email" 
              required 
              placeholder="VD: admin@test.com" 
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* HIỂN THỊ LỖI NẾU CÓ */}
          {errorMsg && (
            <div style={{ color: "#ef4444", fontSize: "14px", background: "#fef2f2", padding: "10px", borderRadius: "6px", border: "1px solid #fecaca" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading} // Khóa nút nếu đang tải
            style={{ 
              background: isLoading ? "#93c5fd" : "#2563eb", // Đổi màu nếu đang tải
              color: "white", 
              padding: "12px", 
              borderRadius: "8px", 
              border: "none", 
              fontWeight: "bold", 
              cursor: isLoading ? "not-allowed" : "pointer",
              marginTop: "10px",
              fontSize: "16px"
            }}
          >
            {isLoading ? "Đang xử lý..." : "Đăng Nhập"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#64748b" }}>
          <Link href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>
            ← Quay lại trang chủ
          </Link>
        </div>

      </div>
    </main>
  );
}