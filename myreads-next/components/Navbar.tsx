// ============================================================================
// FILE: components/Navbar.tsx (Thanh điều hướng toàn hệ thống)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// File này chứa giao diện thanh điều hướng (Navbar) hiển thị ở trên cùng của 
// mọi trang. Nó bao gồm: Logo, Thanh tìm kiếm (SearchBar) và Menu Người dùng (UserMenu).
// 
// [CẬP NHẬT GẦN ĐÂY - LÀM RESPONSIVE]:
// - Đã chuyển từ dùng `style={{...}}` (inline style) sang dùng `className`.
// - LÝ DO: Để có thể sử dụng Media Query trong file `styles.css`, giúp Navbar 
//   tự động rớt dòng (wrap) và hiển thị đẹp trên màn hình điện thoại.
// ============================================================================

// [TỪ KHÓA: import Link]
// - Ý NGHĨA: Component chuyển trang của Next.js.
// - TẠI SAO DÙNG: Giúp chuyển trang mượt mà (Single Page Application) không bị load lại toàn bộ web.
import Link from "next/link";

// [TỪ KHÓA: import SearchBar]
// - Ý NGHĨA: Import thanh tìm kiếm.
// - LƯU Ý: Bên trong SearchBar có dùng hook useSearchParams().
import SearchBar from "./SearchBar";

// [TỪ KHÓA: import UserMenu]
// - Ý NGHĨA: Import Menu người dùng (hiển thị Đăng nhập/Đăng xuất).
// - LƯU Ý: Bên trong UserMenu có đọc Cookie/DB để biết ai đang đăng nhập.
import UserMenu from "./UserMenu"; 

// [TỪ KHÓA: import { Suspense }]
// - Ý NGHĨA: Component bao bọc của React.
// - TẠI SAO DÙNG: Để bọc các component "động" (SearchBar, UserMenu), giải quyết 
//   triệt để lỗi Blocking Route của Next.js.
import { Suspense } from "react";

// [TỪ KHÓA: export default function Navbar()]
// - Ý NGHĨA: Khai báo component Navbar.
// - TẠI SAO KHÔNG DÙNG ASYNC: Vì bản thân Navbar không trực tiếp await dữ liệu, 
//   nó chỉ render khung. Các phần cần await đã được đẩy vào bên trong Suspense.
export default function Navbar() {
  return (
    // [TỪ KHÓA: className="my-navbar"]
    // - Ý NGHĨA: Gắn class để CSS định dạng giao diện (flex, sticky, padding...).
    // - TẠI SAO DÙNG CLASSNAME: Để file styles.css có thể can thiệp đổi giao diện 
    //   khi màn hình nhỏ (Responsive) thông qua @media.
    <header className="my-navbar">
      
      {/* ================================================================
          CỘT TRÁI: LOGO (Tĩnh)
          ================================================================ */}
      <Link href="/" className="my-navbar-logo">
        <span style={{ fontSize: "24px" }}>📚</span>
        <span style={{ fontSize: "20px", fontWeight: "bold", color: "#1e3a8a" }}>MyReads</span>
      </Link>

      {/* ================================================================
          CỘT GIỮA: THANH TÌM KIẾM (Động - Cần Suspense)
          ================================================================ */}
      <div className="my-navbar-search">
        {/* 
          [TỪ KHÓA: <Suspense fallback={...}>]
          - TẠI SAO PHẢI BỌC SEARCHBAR?
            + SearchBar dùng hook useSearchParams() để đọc URL.
            + Nếu không bọc, Next.js sẽ báo lỗi "Blocking Route" khi tải trang.
            + Next.js cần biết URL thực tế của người dùng mới render được SearchBar, 
              nên ta phải dùng Suspense để "trì hoãn" nó lại, render sau cùng.
          - [TỪ KHÓA: fallback]: Khung xám hiển thị tạm thời trong lúc chờ SearchBar tải xong.
        */}
        <Suspense fallback={<div style={{ width: "100%", height: "40px", background: "#f1f5f9", borderRadius: "8px" }} />}>
          <SearchBar />
        </Suspense>
      </div>

      {/* ================================================================
          CỘT PHẢI: USER MENU (Động - Cần Suspense)
          ================================================================ */}
      <div className="my-navbar-menu">
        {/* 
          [TỪ KHÓA: <Suspense fallback={...}>]
          - TẠI SAO PHẢI BỌC USERMENU?
            + UserMenu đọc Cookie để biết user đã đăng nhập chưa (dữ liệu động).
            + Tương tự SearchBar, việc đọc Cookie khiến Next.js không thể tạo 
              bản HTML tĩnh ngay lập tức.
            + Dùng Suspense để trì hoãn, giúp trang web tải khung Navbar ra trước.
        */}
        <Suspense fallback={<div style={{ width: "120px" }}></div>}>
          <UserMenu />
        </Suspense>
      </div>

    </header>
  );
}