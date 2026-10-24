// ============================================================================
// FILE: components/HomeClient.tsx (Giao diện Kệ sách)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// Đây là một Client Component. Nó nhận dữ liệu (các kệ sách và danh sách sách)
// từ Server Component (app/page.tsx) và render ra giao diện lưới các cuốn sách.
//
// [LỊCH SỬ THAY ĐỔI]:
// - Trước đây: File này chứa State `reviewingBook` và một component `<ReviewModal />`
//   để hiển thị popup đánh giá khi bấm vào sách.
// - Hiện tại: Đã XÓA Modal. Lý do là vì component `BookCard` mới đã được thiết kế
//   để hiển thị form đánh giá trực tiếp (inline) và có khung cuộn (scroll) cho các
//   review cũ. Điều này giúp giao diện liền mạch và dễ tương tác hơn.
// ============================================================================

// [TỪ KHÓA: "use client"]
// - Ý NGHĨA: Chỉ thị bắt buộc của Next.js.
// - TẠI SAO DÙNG: Báo cho Next.js biết đây là giao diện phía Client (chạy trên trình duyệt).
//   (Mặc dù hiện tại file này không dùng useState/useEffect, nhưng nó import BookCard
//   - một component có tương tác - nên vẫn cần "use client").
"use client";

// [TỪ KHÓA: import React]
// - Ý NGHĨA: Import thư viện React cơ bản (thường cần thiết cho các component dùng JSX).
import React from "react";

// [TỪ KHÓA: import BookCard]
// - Ý NGHĨA: Import component hiển thị thẻ sách (bao gồm ảnh bìa, tên sách, form đổi kệ,
//   form review và khung hiển thị các review đã có).
import BookCard from "./BookCard";

// ============================================================================
// ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACE)
// ============================================================================
interface HomeClientProps {
  // shelvesData: Là một mảng (Array), mỗi phần tử đại diện cho 1 kệ sách (VD: Đang đọc, Đã đọc).
  // - title: Tên của kệ (VD: "📖 Currently Reading").
  // - books: Mảng chứa danh sách các cuốn sách nằm trên kệ đó.
  shelvesData: { title: string; books: any[] }[];
  
  // isLoggedIn: Cờ (boolean) cho biết người dùng đã đăng nhập hay chưa.
  // - TẠI SAO CẦN: Để truyền xuống BookCard. Nếu chưa đăng nhập, BookCard sẽ ẩn các form tương tác.
  isLoggedIn: boolean;
}

// ============================================================================
// COMPONENT CHÍNH: HomeClient
// ============================================================================
export default function HomeClient({ shelvesData, isLoggedIn }: HomeClientProps) {
  return (
    <div className="shelves-container">
      {/* 
        [TỪ KHÓA: .map()]
        - Ý NGHĨA: Duyệt qua từng kệ sách trong mảng dữ liệu để render ra HTML.
        - CHÚ Ý: Dùng index làm key (key={index}) vì tên kệ (title) có thể trùng hoặc thay đổi,
          nhưng mảng này do ta tự cấu hình nên index khá ổn định.
      */}
      {shelvesData.map((shelf, index) => (
        <section key={index} className="my-shelf">
          {/* Tiêu đề của kệ sách */}
          <h2 className="my-shelf-title">{shelf.title}</h2>
          
          {/* Kiểm tra nếu kệ trống thì hiện thông báo, ngược lại thì render lưới sách */}
          {shelf.books.length === 0 ? (
            <p className="empty-shelf">Kệ này trống.</p>
          ) : (
            <div className="my-book-grid">
              {/* 
                [TỪ KHÓA: .map() lồng nhau]
                - Tiếp tục duyệt qua từng cuốn sách trên kệ hiện tại để render component <BookCard />.
              */}
              {shelf.books.map((book) => (
                <BookCard 
                  key={book.id}        // Key duy nhất cho mỗi cuốn sách (dùng ID từ Database)
                  book={book}          // Truyền toàn bộ thông tin sách (bao gồm cả mảng reviews và avgRating)
                  isLoggedIn={isLoggedIn} // Truyền cờ đăng nhập xuống để hiển thị/ẩn nút đánh giá
                  
                  // [ĐÃ XÓA]: Prop onOpenReview
                  // Trước đây ta truyền hàm onOpenReview={(b) => setReviewingBook(b)} để mở Modal.
                  // Bây giờ BookCard tự xử lý form inline, nên không cần truyền hàm này nữa.
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}