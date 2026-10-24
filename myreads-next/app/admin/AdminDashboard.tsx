// ============================================================================
// FILE: app/admin/AdminDashboard.tsx (Bản nâng cấp: Autocomplete, Chặn lỗi & Sửa Review)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// File giao diện dành riêng cho Admin. Quản lý 5 Tab: Sách, Người dùng, Thể loại, Tác giả, Đánh giá.
// 
// [TÁC DỤNG CHÍNH CỦA BẢN NÂNG CẤP NÀY]:
// - Thay thế ô nhập chữ tự do (dễ gây rác dữ liệu) bằng Component "MultiSelectAutocomplete".
// - Bắt buộc Admin phải chọn Tác giả/Thể loại từ danh sách đã có sẵn trong Database.
// - Nếu gõ sai (không có trong danh sách), hiện cảnh báo đỏ và chặn nút Lưu.
// - [MỚI NHẤT]: Cho phép Admin Sửa Đánh giá (Review) thay vì chỉ có nút Xóa.
// ============================================================================

// [TỪ KHÓA: "use client"]
// - Ý NGHĨA: Báo Next.js đây là Client Component (chạy ở trình duyệt).
// - TẠI SAO DÙNG: Vì ta cần dùng các Hook (useState, useEffect) để làm Tab, Form ẩn/hiện, Xử lý ảnh...
"use client";

// [TỪ KHÓA: useRef]
// - Ý NGHĨA: Tạo ra một "mỏ neo" để trỏ tới một thẻ HTML cụ thể (VD: thẻ div bao quanh ô input).
// - TẠI SAO DÙNG: Để kiểm tra xem người dùng có click chuột ra ngoài vùng gợi ý hay không.
import React, { useState, useEffect, useRef } from "react";

// [TỪ KHÓA: import Server Actions]
// - Ý NGHĨA: Lấy các hàm xử lý từ file admin.ts (Thêm, Sửa, Xóa).
// - LƯU Ý: Có thêm `updateReviewAdminAction` ở dòng cuối để phục vụ việc Sửa Đánh giá.
import {
  deleteBookAdminAction, deleteUserAdminAction, deleteCategoryAction, deleteAuthorAction, deleteReviewAdminAction, updateBookAdminAction,
  createUserAction, updateUserAction,
  createCategoryAction, updateCategoryAction,
  createAuthorAction, updateAuthorAction,
  updateReviewAdminAction // [MỚI] Import action sửa đánh giá
} from "@/app/actions/admin";
import { createBookAction } from "@/app/actions/books";
import "../styles.css";

// ============================================================================
// COMPONENT: MultiSelectAutocomplete (Tự code Gợi ý & Chọn nhiều)
// ============================================================================
function MultiSelectAutocomplete({ 
  name, 
  options, 
  selectedValues, 
  onChange,
  placeholder 
}: { 
  name: string, 
  options: string[], 
  selectedValues: string[], 
  onChange: (values: string[]) => void,
  placeholder: string
}) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Đóng gợi ý và báo lỗi khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        // Nếu đang gõ dở mà click ra ngoài -> Báo lỗi
        if (inputValue && !options.includes(inputValue)) {
          setError(`"${inputValue}" không tồn tại. Vui lòng chọn từ danh sách.`);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, options]);

  // Lọc danh sách gợi ý
  const filteredOptions = options.filter(
    (opt) => opt.toLowerCase().includes(inputValue.toLowerCase()) && !selectedValues.includes(opt)
  );

  const handleSelect = (val: string) => {
    onChange([...selectedValues, val]);
    setInputValue("");
    setError("");
    setShowSuggestions(false);
  };

  const handleRemove = (val: string) => {
    onChange(selectedValues.filter((v) => v !== val));
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", marginBottom: "10px" }}>
      {/* Render các Tag đã chọn */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "5px" }}>
        {selectedValues.map((val) => (
          <span key={val} style={{ background: "#e2e8f0", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
            {val}
            <button type="button" onClick={() => handleRemove(val)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontWeight: "bold" }}>×</button>
            {/* [QUAN TRỌNG]: Input ẩn để gửi mảng lên Server Action */}
            <input type="hidden" name={name} value={val} />
          </span>
        ))}
      </div>

      {/* Ô nhập liệu */}
      <input
        type="text"
        value={inputValue}
        placeholder={placeholder}
        onChange={(e) => {
          setInputValue(e.target.value);
          setShowSuggestions(true);
          setError("");
        }}
        onFocus={() => setShowSuggestions(true)}
        style={{ width: "100%", padding: "8px", borderRadius: "4px", border: error ? "2px solid #ef4444" : "1px solid #cbd5e1", outline: "none" }}
      />
      
      {/* Thông báo lỗi nếu gõ sai */}
      {error && <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: "bold" }}>{error}</span>}

      {/* Dropdown gợi ý */}
      {showSuggestions && filteredOptions.length > 0 && (
        <ul style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", listStyle: "none", padding: "5px 0", margin: 0, zIndex: 10, maxHeight: "150px", overflowY: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          {filteredOptions.map((opt) => (
            <li 
              key={opt} 
              // Dùng onMouseDown thay vì onClick để chạy trước sự kiện onBlur (click ra ngoài)
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }} 
              style={{ padding: "8px 12px", cursor: "pointer", fontSize: "14px" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
              onMouseLeave={(e) => e.currentTarget.style.background = "white"}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


// ============================================================================
// COMPONENT CHÍNH: AdminDashboard
// ============================================================================
interface DashboardProps {
  books: any[];
  users: any[];
  categories: any[];
  authors: any[];
  reviews: any[];
}

export default function AdminDashboard({ books, users, categories, authors, reviews }: DashboardProps) {
  // State quản lý Tab đang mở
  const [activeTab, setActiveTab] = useState<"books" | "users" | "categories" | "authors" | "reviews">("books");
  // State lưu ID của dòng đang được bấm "Sửa" (để biết hiển thị form sửa ở đâu)
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newBookThumbnail, setNewBookThumbnail] = useState("");
  const [editingBookThumbnail, setEditingBookThumbnail] = useState("");

  // Lấy danh sách Tên để làm gợi ý cho Autocomplete
  const authorNamesList = authors.map(a => a.name);
  const categoryNamesList = categories.map(c => c.name);

  // State lưu các mục đã chọn cho Form Thêm và Form Sửa Sách
  const [newBookAuthors, setNewBookAuthors] = useState<string[]>([]);
  const [newBookCategories, setNewBookCategories] = useState<string[]>([]);
  const [editBookAuthors, setEditBookAuthors] = useState<string[]>([]);
  const [editBookCategories, setEditBookCategories] = useState<string[]>([]);

  // Mỗi khi chuyển tab, reset lại các state của form (tránh bị lưu rác từ tab cũ sang tab mới)
  useEffect(() => {
    setEditingId(null);
    setEditingBookThumbnail("");
    setNewBookAuthors([]);
    setNewBookCategories([]);
    setEditBookAuthors([]);
    setEditBookCategories([]);
  }, [activeTab]);

  // Hàm resize ảnh (Giữ nguyên thuật toán Center Crop chống méo)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = reader.result as string;
      const img = new Image();
      img.src = base64Str;
      
      img.onload = () => {
        const targetWidth = 300;
        const targetHeight = 450;
        
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
          const newWidth = img.width * scale;
          const newHeight = img.height * scale;
          const offsetX = (targetWidth - newWidth) / 2;
          const offsetY = (targetHeight - newHeight) / 2;

          ctx.drawImage(img, offsetX, offsetY, newWidth, newHeight);
          const resizedBase64 = canvas.toDataURL("image/webp", 0.9);
          
          if (isEditing) setEditingBookThumbnail(resizedBase64);
          else setNewBookThumbnail(resizedBase64);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  // ==========================================================================
  // HÀM RENDER FORM SỬA DÙNG CHUNG CHO MỌI TAB (Đã cập nhật cho Review)
  // ==========================================================================
  // [TỪ KHÓA: type union "book" | "user" | "category" | "author" | "review"]
  // - Ý NGHĨA: Giới hạn các giá trị `type` được phép truyền vào hàm.
  // - [MỚI]: Đã thêm "review" để hàm có thể render form sửa đánh giá.
  const renderEditForm = (id: string, type: "book" | "user" | "category" | "author" | "review", data: any) => {
    // Nếu dòng này không phải là dòng đang được chọn để sửa -> Không render gì cả
    if (editingId !== id) return null;

    // Xử lý riêng cho Sách: Load dữ liệu cũ (tác giả, thể loại) vào Autocomplete
    if (type === "book") {
      if (editBookAuthors.length === 0 && data.authors) {
        setEditBookAuthors(data.authors.split(",").map((s: string) => s.trim()));
      }
      if (editBookCategories.length === 0 && data.categories) {
        setEditBookCategories(data.categories.split(",").map((s: string) => s.trim()));
      }
    }

    return (
      <tr style={{ background: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
        {/* [TỪ KHÓA: colSpan={5}] - Gộp 5 cột thành 1 để form hiển thị full chiều ngang */}
        <td colSpan={5} style={{ padding: "20px" }}>
          <form 
            // [TỪ KHÓA: Dynamic Action]
            // - Ý NGHĨA: Tùy vào `type` đang sửa là gì mà gắn Server Action tương ứng.
            // - [MỚI]: Thêm nhánh fallback `updateReviewAdminAction` ở cuối cho Review.
            action={
              type === "book" ? updateBookAdminAction 
              : type === "user" ? updateUserAction 
              : type === "category" ? updateCategoryAction 
              : type === "author" ? updateAuthorAction 
              : updateReviewAdminAction
            } 
            onSubmit={() => { setEditingId(null); setEditBookAuthors([]); setEditBookCategories([]); }} 
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}
          >
            {/* Input ẩn chứa ID của dòng đang sửa (bookId, userId, ... hoặc reviewId) */}
            <input type="hidden" name={type === "book" ? "bookId" : type === "user" ? "userId" : type === "category" ? "categoryId" : type === "author" ? "authorId" : "reviewId"} value={id} />

            {/* --- FORM SỬA SÁCH --- */}
            {type === "book" && (
              <>
                <div><label style={{ fontSize: "12px", fontWeight: "bold" }}>Tên sách</label><input name="title" defaultValue={data.title} required className="my-input" style={{ width: "100%" }} /></div>
                <div><label style={{ fontSize: "12px", fontWeight: "bold" }}>Năm XB</label><input name="publishedYear" type="number" defaultValue={data.published_year} className="my-input" style={{ width: "100%" }} /></div>
                
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Tác giả</label>
                  <MultiSelectAutocomplete name="authors" options={authorNamesList} selectedValues={editBookAuthors} onChange={setEditBookAuthors} placeholder="Chọn tác giả..." />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Thể loại</label>
                  <MultiSelectAutocomplete name="categories" options={categoryNamesList} selectedValues={editBookCategories} onChange={setEditBookCategories} placeholder="Chọn thể loại..." />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Ảnh bìa (URL hoặc Tải lên)</label>
                  <input type="hidden" name="thumbnail" value={editingBookThumbnail} />
                  <input type="text" value={editingBookThumbnail.startsWith('data:') ? 'Đã tải ảnh lên từ máy' : editingBookThumbnail} onChange={(e) => setEditingBookThumbnail(e.target.value)} className="my-input" style={{ width: "100%", marginBottom: "8px" }} />
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} style={{ fontSize: "12px" }} />
                  {editingBookThumbnail && <img src={editingBookThumbnail} alt="Preview" style={{ width: "64px", height: "96px", objectFit: "cover", marginTop: "8px", borderRadius: "4px" }} />}
                </div>
              </>
            )}

            {/* --- FORM SỬA NGƯỜI DÙNG --- */}
            {type === "user" && (
              <>
                <div><label style={{ fontSize: "12px", fontWeight: "bold" }}>Tên người dùng</label><input name="name" defaultValue={data.name} required className="my-input" style={{ width: "100%" }} /></div>
                <div><label style={{ fontSize: "12px", fontWeight: "bold" }}>Quyền</label>
                  <select name="role" defaultValue={data.role} className="my-input" style={{ width: "100%" }}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select>
                </div>
              </>
            )}

            {/* --- FORM SỬA THỂ LOẠI / TÁC GIẢ --- */}
            {(type === "category" || type === "author") && (
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: "12px", fontWeight: "bold" }}>Tên {type === "category" ? "thể loại" : "tác giả"}</label>
                <input name="name" defaultValue={data.name} required className="my-input" style={{ width: "100%" }} />
              </div>
            )}

            {/* --- [MỚI] FORM SỬA ĐÁNH GIÁ (REVIEW) --- */}
            {type === "review" && (
              <>
                {/* Hiển thị Người dùng & Sách dạng read-only (disabled) vì Admin không được phép đổi người đánh giá hay đổi sách */}
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Người dùng (Không thể sửa)</label>
                  <input value={data.userName ?? ""} disabled className="my-input" style={{ width: "100%", background: "#f1f5f9", color: "#64748b" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Sách (Không thể sửa)</label>
                  <input value={data.bookTitle ?? ""} disabled className="my-input" style={{ width: "100%", background: "#f1f5f9", color: "#64748b" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Số sao (1–5)</label>
                  {/* Dùng select thay vì input number để tránh admin gõ số linh tinh (âm, số thập phân) */}
                  <select name="rating" defaultValue={data.rating} className="my-input" style={{ width: "100%" }} required>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>⭐ {n}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Nội dung đánh giá</label>
                  <textarea name="content" defaultValue={data.content ?? ""} rows={3} className="my-input" style={{ width: "100%", resize: "vertical" }} />
                </div>
              </>
            )}

            {/* NÚT LƯU / HỦY */}
            <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button type="submit" style={{ background: "#2563eb", color: "white", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }}>Lưu thay đổi</button>
              <button type="button" onClick={() => setEditingId(null)} style={{ background: "#cbd5e1", color: "#333", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }}>Hủy bỏ</button>
            </div>
          </form>
        </td>
      </tr>
    );
  };

  return (
    <div>
      {/* THANH ĐIỀU HƯỚNG TAB */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", flexWrap: "wrap" }}>
        <button onClick={() => setActiveTab("books")} style={{ padding: "10px 20px", fontWeight: "bold", cursor: "pointer", backgroundColor: activeTab === "books" ? "#2563eb" : "#f1f5f9", color: activeTab === "books" ? "white" : "#333", border: "none", borderRadius: "8px" }}>📚 Quản lý Sách</button>
        <button onClick={() => setActiveTab("users")} style={{ padding: "10px 20px", fontWeight: "bold", cursor: "pointer", backgroundColor: activeTab === "users" ? "#2563eb" : "#f1f5f9", color: activeTab === "users" ? "white" : "#333", border: "none", borderRadius: "8px" }}>👥 Người dùng</button>
        <button onClick={() => setActiveTab("categories")} style={{ padding: "10px 20px", fontWeight: "bold", cursor: "pointer", backgroundColor: activeTab === "categories" ? "#2563eb" : "#f1f5f9", color: activeTab === "categories" ? "white" : "#333", border: "none", borderRadius: "8px" }}>🏷️ Thể loại</button>
        <button onClick={() => setActiveTab("authors")} style={{ padding: "10px 20px", fontWeight: "bold", cursor: "pointer", backgroundColor: activeTab === "authors" ? "#2563eb" : "#f1f5f9", color: activeTab === "authors" ? "white" : "#333", border: "none", borderRadius: "8px" }}>✍️ Tác giả</button>
        <button onClick={() => setActiveTab("reviews")} style={{ padding: "10px 20px", fontWeight: "bold", cursor: "pointer", backgroundColor: activeTab === "reviews" ? "#2563eb" : "#f1f5f9", color: activeTab === "reviews" ? "white" : "#333", border: "none", borderRadius: "8px" }}>⭐ Đánh giá</button>
      </div>

      {/* --- TAB 1: QUẢN LÝ SÁCH --- */}
      {activeTab === "books" && (
        <section>
          <div className="my-form-section" style={{ marginBottom: "30px" }}>
            <h3>Thêm sách mới</h3>
            <form action={createBookAction} onSubmit={() => { setNewBookThumbnail(""); setNewBookAuthors([]); setNewBookCategories([]); }} className="my-form-grid">
              <div className="my-form-group"><label>Tên sách</label><input name="title" required className="my-input" /></div>
              <div className="my-form-group"><label>ISBN</label><input name="isbn" className="my-input" /></div>
              <div className="my-form-group"><label>Năm XB</label><input name="publishedYear" type="number" className="my-input" /></div>
              <div className="my-form-group">
                <label>Ảnh bìa (URL hoặc Tải lên)</label>
                <input type="hidden" name="thumbnail" value={newBookThumbnail} />
                <input type="text" value={newBookThumbnail.startsWith('data:') ? 'Đã tải ảnh lên từ máy' : newBookThumbnail} onChange={(e) => setNewBookThumbnail(e.target.value)} className="my-input" style={{ marginBottom: "8px" }} />
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} style={{ fontSize: "12px" }} />
                {newBookThumbnail && <img src={newBookThumbnail} alt="Preview" style={{ width: "64px", height: "96px", objectFit: "cover", marginTop: "8px", borderRadius: "4px" }} />}
              </div>
              
              <div className="my-form-group">
                <label>Tác giả</label>
                <MultiSelectAutocomplete name="authors" options={authorNamesList} selectedValues={newBookAuthors} onChange={setNewBookAuthors} placeholder="Gõ để tìm tác giả..." />
              </div>
              <div className="my-form-group">
                <label>Thể loại</label>
                <MultiSelectAutocomplete name="categories" options={categoryNamesList} selectedValues={newBookCategories} onChange={setNewBookCategories} placeholder="Gõ để tìm thể loại..." />
              </div>

              <div className="my-full-width" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="my-submit-btn">+ Thêm Sách</button>
              </div>
            </form>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", background: "white" }}>
            <thead style={{ backgroundColor: "#f8fafc" }}>
              <tr><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Tên sách</th><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Tác giả</th><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Năm XB</th><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Hành động</th></tr>
            </thead>
            <tbody>
              {books.map((book) => (
                // [TỪ KHÓA: React.Fragment]
                // - Ý NGHĨA: Nhóm nhiều thẻ HTML lại mà không tạo ra thẻ div thừa.
                // - TẠI SAO DÙNG: Vì trong <tbody> chỉ được phép chứa <tr>, ta cần bọc <tr> của dòng dữ liệu và <tr> của form sửa lại với nhau.
                <React.Fragment key={book.id}>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px", fontWeight: "bold" }}>{book.title}</td>
                    <td style={{ padding: "12px", color: "#64748b" }}>{book.authors}</td>
                    <td style={{ padding: "12px" }}>{book.published_year}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      {/* Nút Sửa: Set editingId = ID sách. Nếu đang sửa sách này rồi thì hiện chữ "Hủy" để đóng form */}
                      <button onClick={() => { setEditingId(book.id); setEditingBookThumbnail(book.thumbnail || ""); }} style={{ marginRight: "8px", padding: "6px 12px", background: "#eab308", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                        {editingId === book.id ? "Hủy" : "Sửa"}
                      </button>
                      <form action={deleteBookAdminAction} style={{ display: "inline" }}><input type="hidden" name="bookId" value={book.id} /><button type="submit" style={{ padding: "6px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Xóa</button></form>
                    </td>
                  </tr>
                  {/* Render form sửa ngay dưới dòng hiện tại */}
                  {renderEditForm(book.id, "book", book)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* --- TAB 2: QUẢN LÝ NGƯỜI DÙNG --- */}
      {activeTab === "users" && (
        <section>
          <div className="my-form-section" style={{ marginBottom: "30px" }}>
            <h3>Thêm Người dùng mới</h3>
            <form action={createUserAction} className="my-form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
              <div className="my-form-group"><label>Tên</label><input name="name" required className="my-input" /></div>
              <div className="my-form-group"><label>Email</label><input name="email" type="email" required className="my-input" /></div>
              <div className="my-form-group"><label>Quyền</label>
                <select name="role" className="my-input"><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select>
              </div>
              <div className="my-form-group" style={{ justifyContent: "flex-end" }}>
                <button type="submit" className="my-submit-btn">+ Thêm</button>
              </div>
            </form>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", background: "white" }}>
            <thead style={{ backgroundColor: "#f8fafc" }}>
              <tr><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Tên</th><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Email</th><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Vai trò</th><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Hành động</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <React.Fragment key={u.id}>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px" }}>{u.name}</td>
                    <td style={{ padding: "12px" }}>{u.email}</td>
                    <td style={{ padding: "12px" }}><span style={{ background: u.role === "ADMIN" ? "#fee2e2" : "#e0f2fe", color: u.role === "ADMIN" ? "#991b1b" : "#0369a1", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "bold" }}>{u.role}</span></td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <button onClick={() => setEditingId(u.id)} style={{ marginRight: "8px", padding: "6px 12px", background: "#eab308", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>{editingId === u.id ? "Hủy" : "Sửa"}</button>
                      <form action={deleteUserAdminAction} style={{ display: "inline" }}><input type="hidden" name="userId" value={u.id} /><button type="submit" style={{ padding: "6px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Xóa</button></form>
                    </td>
                  </tr>
                  {renderEditForm(u.id, "user", u)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* --- TAB 3: QUẢN LÝ THỂ LOẠI --- */}
      {activeTab === "categories" && (
        <section>
          <div className="my-form-section" style={{ marginBottom: "20px" }}>
            <h3>Thêm Thể loại</h3>
            <form action={createCategoryAction} style={{ display: "flex", gap: "10px" }}>
              <input name="name" required placeholder="Nhập tên thể loại..." className="my-input" style={{ flex: 1 }} />
              <button type="submit" className="my-submit-btn">+ Thêm</button>
            </form>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", background: "white" }}>
            <thead style={{ backgroundColor: "#f8fafc" }}><tr><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Tên thể loại</th><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Hành động</th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <React.Fragment key={c.id}>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px" }}>{c.name}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <button onClick={() => setEditingId(c.id)} style={{ marginRight: "8px", padding: "6px 12px", background: "#eab308", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>{editingId === c.id ? "Hủy" : "Sửa"}</button>
                      <form action={deleteCategoryAction} style={{ display: "inline" }}><input type="hidden" name="categoryId" value={c.id} /><button type="submit" style={{ padding: "6px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Xóa</button></form>
                    </td>
                  </tr>
                  {renderEditForm(c.id, "category", c)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* --- TAB 4: QUẢN LÝ TÁC GIẢ --- */}
      {activeTab === "authors" && (
        <section>
          <div className="my-form-section" style={{ marginBottom: "20px" }}>
            <h3>Thêm Tác giả</h3>
            <form action={createAuthorAction} style={{ display: "flex", gap: "10px" }}>
              <input name="name" required placeholder="Nhập tên tác giả..." className="my-input" style={{ flex: 1 }} />
              <button type="submit" className="my-submit-btn">+ Thêm</button>
            </form>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", background: "white" }}>
            <thead style={{ backgroundColor: "#f8fafc" }}><tr><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Tên tác giả</th><th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Hành động</th></tr></thead>
            <tbody>
              {authors.map((a) => (
                <React.Fragment key={a.id}>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px" }}>{a.name}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <button onClick={() => setEditingId(a.id)} style={{ marginRight: "8px", padding: "6px 12px", background: "#eab308", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>{editingId === a.id ? "Hủy" : "Sửa"}</button>
                      <form action={deleteAuthorAction} style={{ display: "inline" }}><input type="hidden" name="authorId" value={a.id} /><button type="submit" style={{ padding: "6px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Xóa</button></form>
                    </td>
                  </tr>
                  {renderEditForm(a.id, "author", a)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* --- TAB 5: QUẢN LÝ ĐÁNH GIÁ (Đã cập nhật) --- */}
      {activeTab === "reviews" && (
        <section>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", background: "white" }}>
            <thead style={{ backgroundColor: "#f8fafc" }}>
              <tr>
                <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Người dùng</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Sách</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Điểm</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>Nội dung</th>
                <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                // Bọc trong Fragment để có thể hiển thị thêm Form Sửa bên dưới thẻ <tr>
                <React.Fragment key={r.id}>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px" }}>{r.userName}</td>
                    <td style={{ padding: "12px" }}>{r.bookTitle}</td>
                    <td style={{ padding: "12px" }}>⭐ {r.rating}</td>
                    <td style={{ padding: "12px" }}>{r.content}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      
                      {/* [MỚI] Nút Sửa Đánh Giá */}
                      <button 
                        onClick={() => setEditingId(r.id)} 
                        style={{ marginRight: "8px", padding: "6px 12px", background: "#eab308", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                      >
                        {editingId === r.id ? "Hủy" : "Sửa"}
                      </button>

                      <form action={deleteReviewAdminAction} style={{ display: "inline" }}>
                        <input type="hidden" name="reviewId" value={r.id} />
                        <button type="submit" style={{ padding: "6px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Xóa</button>
                      </form>
                    </td>
                  </tr>
                  
                  {/* [MỚI] Gọi hàm render form sửa với type="review" */}
                  {renderEditForm(r.id, "review", r)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}