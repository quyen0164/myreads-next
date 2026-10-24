// ============================================================================
// FILE: components/BookCard.tsx (Đã thêm khung hiển thị Review có scroll)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// Hiển thị thông tin 1 cuốn sách: ảnh bìa, tên, tác giả, điểm TB, form đổi kệ,
// form gửi review, VÀ danh sách các review đã có (trong khung có scroll).
//
// [THAY ĐỔI GẦN ĐÂY]:
// - Thêm khối <div> có maxHeight + overflowY: auto để chứa danh sách review.
// - Khi có nhiều review, khung này sẽ cuộn thay vì kéo dài thẻ sách vô tận.
// - Hiển thị điểm trung bình (avgRating) lấy từ listBooksForUser.
// ============================================================================

"use client";

import React, { useState } from "react";
import { updateShelfAction, saveReviewAction, deleteBookAction } from "@/app/actions/books";

// [INTERFACE]: Định nghĩa kiểu dữ liệu cho props
// - `reviews` và `avgRating` là 2 trường MỚI do listBooksForUser bổ sung.
interface BookCardProps {
  book: {
    id: string;
    title: string;
    authors: string | null;
    thumbnail: string | null;
    published_year: number | null;
    shelf: string | null;
    reviews: Array<{
      id: string;
      userName: string;
      rating: number;
      content: string;
      created_at: string;
    }>;
    avgRating: number | null;
  };
  isLoggedIn: boolean;
}

export default function BookCard({ book, isLoggedIn }: BookCardProps) {
  // State cục bộ cho form review (để reset sau khi submit)
  const [showReviewForm, setShowReviewForm] = useState(false);

  return (
    <div className="my-book-card">
      {/* ẢNH BÌA */}
      <div className="my-book-cover">
        {book.thumbnail ? (
          <img src={book.thumbnail} alt={book.title} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", borderRadius: "8px", fontSize: "12px" }}>
            Không có ảnh
          </div>
        )}
      </div>

      {/* THÔNG TIN SÁCH */}
      <div className="my-book-info">
        <h3 className="my-book-title">{book.title}</h3>
        <p className="my-book-author">{book.authors || "Chưa rõ tác giả"}</p>

        {/* ĐIỂM TRUNG BÌNH */}
        {book.avgRating && (
          <div className="my-rating-badge">
            ⭐ {book.avgRating} / 5 ({book.reviews.length} đánh giá)
          </div>
        )}

        {/* ================================================================
            KHUNG HIỂN THỊ CÁC REVIEW ĐÃ CÓ
            ================================================================
            [TẠI SAO DÙNG maxHeight + overflowY]:
            - Nếu 1 cuốn sách có 20 review, để tràn lan sẽ kéo thẻ sách dài
              vô tận → vỡ layout grid. Khung cuộn giữ thẻ gọn, ai muốn xem
              thêm thì tự lăn chuột trong khung.
        */}
        {book.reviews.length > 0 && (
          <div
            style={{
              marginBottom: "12px",
              borderTop: "1px solid #f1f5f9",
              paddingTop: "10px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b", marginBottom: "6px" }}>
              Đánh giá ({book.reviews.length})
            </div>

            <div
              style={{
                maxHeight: "160px",      // Chiều cao tối đa
                overflowY: "auto",       // Bật scroll dọc khi nội dung vượt
                paddingRight: "6px",     // Chừa chỗ cho scrollbar
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {book.reviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <strong style={{ color: "#0f172a" }}>{review.userName}</strong>
                    <span style={{ color: "#f59e0b", fontWeight: "bold" }}>⭐ {review.rating}</span>
                  </div>
                  <div style={{ color: "#334155", lineHeight: 1.4, wordBreak: "break-word" }}>
                    {review.content || <em style={{ color: "#94a3b8" }}>(Không có nội dung)</em>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            KHU VỰC HÀNH ĐỘNG (đổi kệ sách / gửi review) — chỉ hiện khi đã login
            ================================================================ */}
        <div className="my-actions" style={{ marginTop: "auto" }}>
          {isLoggedIn ? (
            <>
              {/* ĐỔI KỆ SÁCH */}
              <form action={updateShelfAction} className="my-action-row">
                <input type="hidden" name="bookId" value={book.id} />
                <select name="shelf" defaultValue={book.shelf || "none"} className="my-select">
                  <option value="none">— Chưa xếp kệ —</option>
                  <option value="want_to_read">⏳ Muốn đọc</option>
                  <option value="reading">📖 Đang đọc</option>
                  <option value="read">✅ Đã đọc</option>
                </select>
                <button type="submit" className="my-btn-shelf">Lưu</button>
              </form>

              {/* NÚT MỞ FORM REVIEW */}
              <button
                type="button"
                className="my-btn-review"
                onClick={() => setShowReviewForm((v) => !v)}
                style={{ width: "100%" }}
              >
                {showReviewForm ? "✕ Đóng" : "✍️ Viết đánh giá"}
              </button>

              {/* FORM GỬI REVIEW (mở/đóng bằng state) */}
              {showReviewForm && (
                <form
                  action={saveReviewAction}
                  onSubmit={() => setShowReviewForm(false)}
                  className="my-review-box"
                >
                  <input type="hidden" name="bookId" value={book.id} />
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <label style={{ fontSize: "13px", fontWeight: "bold" }}>Số sao:</label>
                    <select name="rating" defaultValue="5" className="my-select" style={{ flex: 1 }}>
                      <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                      <option value="4">⭐⭐⭐⭐ (4)</option>
                      <option value="3">⭐⭐⭐ (3)</option>
                      <option value="2">⭐⭐ (2)</option>
                      <option value="1">⭐ (1)</option>
                    </select>
                  </div>
                  <textarea
                    name="content"
                    placeholder="Cảm nhận của bạn về cuốn sách này..."
                    rows={3}
                    className="my-select"
                    style={{ resize: "vertical", fontFamily: "inherit" }}
                  />
                  <button type="submit" className="my-btn-review">Gửi đánh giá</button>
                </form>
              )}
            </>
          ) : (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic", textAlign: "center", margin: 0 }}>
              Đăng nhập để tương tác với sách
            </p>
          )}
        </div>
      </div>
    </div>
  );
}