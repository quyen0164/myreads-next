// ============================================================================
// FILE: app/layout.tsx (Khung xương toàn bộ ứng dụng)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// Đây là Root Layout (Bố cục gốc). Next.js sẽ bọc file này ra ngoài tất cả các trang khác.
// Nó tương tự như file index.html trong một dự án web truyền thống.
//
// [TÁC DỤNG LÀM GÌ?]:
// - Khai báo ngôn ngữ cho trình duyệt (lang="vi").
// - Chứa các thẻ <html> và <body> gốc.
// - Nhúng file CSS toàn cục (Global CSS).
// - Cung cấp thông tin SEO (tiêu đề tab, mô tả).
// - Hiển thị Navbar ở mọi trang.
// - Biến `children` là nơi các trang con (như page.tsx) sẽ được "nhét" vào.
// ============================================================================

// [TỪ KHÓA: import type { Metadata } from "next"]
// - Ý NGHĨA: Import một "kiểu dữ liệu" (Type) chứ không phải một hàm thực thi.
// - TẠI SAO DÙNG DẤU `type`: Để báo TypeScript biết đây chỉ là định nghĩa kiểu. Khi build code, dòng import này sẽ bị xóa đi để giảm dung lượng file.
import type { Metadata } from "next";

// [TỪ KHÓA: import "./globals.css"]
// - Ý NGHĨA: Import file CSS toàn cục (do Next.js tạo sẵn khi cài đặt, thường chứa Tailwind).
// - TẠI SAO DÙNG: Để reset các CSS mặc định của trình duyệt (như margin, padding) và thiết lập font chữ gốc.
import "./globals.css";

// [TỪ KHÓA: import Navbar]
// - Ý NGHĨA: Import Component thanh điều hướng (Navbar) mà chúng ta vừa tạo.
// - TẠI SAO DÙNG: Để đưa Navbar vào Layout gốc, giúp nó xuất hiện trên TẤT CẢ các trang (Trang chủ, Admin, Login).
import Navbar from "@/components/Navbar";

// [TỪ KHÓA: export const metadata]
// - Ý NGHĨA: Khai báo một object chứa thông tin "Siêu dữ liệu" (Metadata).
// - TẠI SAO DÙNG: Next.js sẽ tự động đọc object này và chèn vào thẻ <head> của HTML.
export const metadata: Metadata = {
  title: "MyReads - Quản lý thư viện sách", // Tiêu đề hiện trên tab trình duyệt
  description: "Ứng dụng quản lý sách cá nhân với Next.js và SQLite", // Mô tả hiện trên Google
};

// [HÀM: RootLayout]
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // [TỪ KHÓA: <html lang="vi">]
    // - Ý NGHĨA: Thẻ gốc của HTML, khai báo ngôn ngữ chính là tiếng Việt (vi).
    <html lang="vi" suppressHydrationWarning>
      
      <body>
        
        {/* 
          [THÊM NAVBAR VÀO ĐÂY]
          - Đặt Navbar ở trên cùng của body.
          - Vì nó nằm trong Layout, nên khi bạn chuyển trang (từ Trang chủ sang Admin), Navbar sẽ không bị load lại (giữ nguyên trạng thái, không bị nhấp nháy).
        */}
        <Navbar />

        {/* 
          [TỪ KHÓA: {children}]
          - Ý NGHĨA: Đây là "cái lỗ" (placeholder) để Next.js nhét giao diện của các trang con vào.
          - VÍ DỤ: Nếu bạn đang ở đường dẫn `/admin`, Next.js sẽ lấy toàn bộ code trong `app/admin/page.tsx` nhét vào vị trí này.
        */}
        {children}

      </body>
    </html>
  );
}