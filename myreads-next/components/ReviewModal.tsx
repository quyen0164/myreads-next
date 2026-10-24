// components/ReviewModal.tsx
"use client";

import React, { useState } from "react";
import { saveReviewAction } from "@/app/actions/books";

interface ReviewModalProps {
  book: any; // Cuốn sách đang được chọn để review
  onClose: () => void; // Hàm đóng Modal
}

export default function ReviewModal({ book, onClose }: ReviewModalProps) {
  // [TỪ KHÓA: useState]
  // - Ý NGHĨA: Lưu điểm (rating) và nội dung (content) người dùng đang nhập.
  // - TẠI SAO DÙNG: Để hiển thị lên input và gửi lên Server.
  const [rating, setRating] = useState(book.my_rating || 5);
  const [content, setContent] = useState(book.my_review || "");

  const handleSubmit = async (e: React.FormEvent) => {
    // [TỪ KHÓA: e.preventDefault()]
    // - Ý NGHĨA: Chặn trình duyệt tự động F5 trang khi submit form. 
    // - TẠI SAO DÙNG: Vì ta muốn xử lý bằng AJAX (gửi ngầm) để giữ nguyên trạng thái Modal.
    e.preventDefault();
    
    // [TỪ KHÓA: new FormData()]
    // - Ý NGHĨA: Tạo một object FormData thủ công.
    // - TẠI SAO PHẢI DÙNG: Vì Server Action `saveReviewAction` yêu cầu đầu vào là FormData.
    // - CÁCH KHÁC: Có thể dùng <form action={...}> trực tiếp, nhưng khi đó ta không thể gọi hàm `onClose()` ngay sau khi lưu xong.
    const formData = new FormData();
    formData.append("bookId", book.id);
    formData.append("rating", String(rating));
    formData.append("content", content);

    // Gọi Server Action (Gửi request lên Server)
    await saveReviewAction(formData);
    
    // Đóng Modal sau khi lưu thành công
    onClose();
  };

  return (
    // [TỪ KHÓA: position: "fixed"]
    // - Ý NGHĨA: Cố định lớp nền đen mờ này bám theo màn hình, không bị cuộn.
    // - [TỪ KHÓA: backgroundColor: "rgba(0,0,0,0.5)"]: Nền đen mờ 50%.
    // - [TỪ KHÓA: zIndex: 1000]: Đảm bảo nó nổi lên TRÊN TẤT CẢ mọi thứ khác.
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      
      {/* [TỪ KHÓA: Hộp thoại chính (Modal Content)] */}
      <div style={{
        background: "white", padding: "30px", borderRadius: "16px",
        width: "90%", maxWidth: "500px"
      }}>
        <h2 style={{ marginTop: 0, marginBottom: "20px" }}>Đánh giá sách: {book.title}</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Số sao</label>
            {/* [TỪ KHÓA: value & onChange]
                - Đây là "Controlled Component" (Input được kiểm soát bởi State).
                - TẠI SAO DÙNG: Để React luôn biết giá trị hiện tại là gì. */}
            <select 
              value={rating} 
              onChange={(e) => setRating(Number(e.target.value))}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            >
              <option value="1">1 ⭐</option>
              <option value="2">2 ⭐</option>
              <option value="3">3 ⭐</option>
              <option value="4">4 ⭐</option>
              <option value="5">5 ⭐</option>
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Cảm nghĩ của bạn</label>
            {/* [TỪ KHÓA: <textarea>]
                - Ý NGHĨA: Ô nhập văn bản nhiều dòng (thay vì <input> chỉ 1 dòng). */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              placeholder="Hãy chia sẻ cảm nhận của bạn..."
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer" }}>Hủy</button>
            <button type="submit" style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#10b981", color: "white", cursor: "pointer" }}>Gửi đánh giá</button>
          </div>
        </form>
      </div>
    </div>
  );
}