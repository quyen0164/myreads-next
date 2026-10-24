// ============================================================================
// FILE: components/SearchBar.tsx
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// Đây là thanh tìm kiếm (Search Bar) dành cho người dùng.
// Thay vì tải toàn bộ sách về máy khách (Client) rồi dùng JavaScript để lọc,
// ta sẽ đẩy từ khóa lên URL (VD: /?q=Clean).
// Server (page.tsx) sẽ đọc URL này và lọc dữ liệu trực tiếp từ Database.
// ============================================================================

// [TỪ KHÓA: "use client"]
// - Ý NGHĨA: Chỉ thị bắt buộc của Next.js.
// - TẠI SAO DÙNG: Vì ta cần dùng các Hook tương tác (useState, useRouter, useSearchParams)
//   nên component này bắt buộc phải chạy ở phía Client (trình duyệt).
"use client";

// [TỪ KHÓA: import useState]
// - Ý NGHĨA: Hook quản lý trạng thái (State).
// - TẠI SAO DÙNG: Để lưu lại những gì người dùng đang gõ vào ô input.
import { useState } from "react";

// [TỪ KHÓA: useRouter]
// - Ý NGHĨA: Hook của Next.js dùng để điều hướng (chuyển trang).
// - TẠI SAO DÙNG: Để đẩy từ khóa lên URL mà không làm tải lại toàn bộ trang web.
// [TỪ KHÓA: useSearchParams]
// - Ý NGHĨA: Hook dùng để đọc các tham số hiện có trên URL.
// - TẠI SAO DÙNG: Để giữ lại từ khóa trong ô input khi người dùng F5 (tải lại trang).
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchBar() {
  // [TỪ KHÓA: router]
  // - Đối tượng dùng để thực hiện lệnh chuyển trang (router.push).
  const router = useRouter();
  
  // [TỪ KHÓA: searchParams]
  // - Đọc các tham số trên thanh địa chỉ. VD: URL là /?q=Clean thì searchParams.get("q") trả về "Clean".
  const searchParams = useSearchParams();
  
  // [STATE: query]
  // - Ý NGHĨA: Lưu giá trị của ô tìm kiếm.
  // - Khởi tạo: Lấy từ khóa hiện tại trên URL (nếu có) hoặc chuỗi rỗng "".
  // - TẠI SAO KHỞI TẠO NHƯ VẬY: Để khi người dùng F5 trang, ô tìm kiếm vẫn giữ nguyên chữ họ vừa gõ.
  const [query, setQuery] = useState(searchParams.get("q") || "");

  // [HÀM: handleSearch]
  // - Ý NGHĨA: Hàm xử lý khi người dùng submit form (Bấm nút Tìm hoặc gõ Enter).
  const handleSearch = (e: React.FormEvent) => {
    // [TỪ KHÓA: e.preventDefault()]
    // - Ý NGHĨA: Chặn trình duyệt tự động tải lại trang (F5) khi submit form HTML truyền thống.
    e.preventDefault(); 
    
    // Kiểm tra xem người dùng có gõ chữ nào không (đã xóa khoảng trắng 2 đầu).
    if (query.trim()) {
      // [TỪ KHÓA: router.push()]
      // - Ý NGHĨA: Chuyển hướng người dùng đến đường dẫn mới.
      // - [TỪ KHÓA: encodeURIComponent()]
      //   + Hàm này dùng để mã hóa các ký tự đặc biệt trên URL.
      //   + VD: Nếu gõ "Clean Code", nó sẽ đổi thành "Clean%20Code" (dấu cách thành %20).
      //   + Nếu không dùng, trình duyệt có thể hiểu sai hoặc lỗi với tiếng Việt có dấu.
      router.push(`/?q=${encodeURIComponent(query.trim())}`);
    } else {
      // Nếu người dùng xóa trắng ô tìm kiếm và bấm Tìm -> Đưa về trang chủ (hiển thị tất cả sách).
      router.push(`/`);
    }
  };

  return (
    // [TỪ KHÓA: onSubmit]
    // - Gắn hàm handleSearch vào sự kiện submit của form.
    <form 
      onSubmit={handleSearch} 
      style={{ 
        display: "flex", 
        gap: "8px", 
        width: "100%", 
        maxWidth: "500px", 
        margin: "0 auto" 
      }}
    >
      {/* Ô NHẬP TỪ KHÓA */}
      <input
        type="text"
        value={query} // Ràng buộc giá trị của input với State
        onChange={(e) => setQuery(e.target.value)} // Cập nhật State mỗi khi gõ phím
        placeholder="Tìm tên sách, tác giả, ISBN..."
        style={{
          flex: 1, // Chiếm toàn bộ khoảng trống còn lại
          padding: "10px 16px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          outline: "none",
          fontSize: "15px"
        }}
      />
      
      {/* NÚT TÌM KIẾM */}
      <button
        type="submit"
        style={{
          background: "#2563eb",
          color: "white",
          padding: "10px 20px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          fontWeight: "bold",
          whiteSpace: "nowrap" // Không cho chữ bị rớt xuống dòng
        }}
      >
        🔍 Tìm kiếm
      </button>
    </form>
  );
}