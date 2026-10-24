// app/actions/admin.ts

// ============================================================================
// FILE: app/actions/admin.ts (Nâng cấp toàn diện CRUD)
// ============================================================================
// [Ý NGHĨA]: Chứa toàn bộ Server Actions dành riêng cho Admin.
//
// [TÁC DỤNG]: Cung cấp các hàm Thêm, Sửa, Xóa cho tất cả các bảng:
//   Books, Users, Categories, Authors, Reviews.
//
// [TẠI SAO CẦN NHIỀU HÀM NHƯ VẬY]:
// - Mỗi bảng có cấu trúc dữ liệu khác nhau (Books có title/ISBN, Users có email/role,
//   Reviews có rating/content...), nên không thể dùng chung 1 hàm xóa/1 hàm sửa
//   cho tất cả được. Phải tách hàm riêng để:
//   + Validate đúng trường của từng bảng.
//   + Đảm bảo kiểu dữ liệu chính xác khi UPDATE.
//   + Báo lỗi rõ ràng cho từng trường hợp (trùng email, trùng thể loại...).
//
// [CẬP NHẬT GẦN ĐÂY]:
// - Thêm `updateReviewAdminAction` để Admin sửa được rating + content của review
//   (trước đó tab Đánh giá chỉ có nút Xóa).
// - Chỉ cho sửa 2 cột: rating và content. KHÔNG cho sửa user_id, book_id, created_at
//   — đó là dữ liệu gốc, đổi sẽ làm sai ngữ nghĩa của review.
// ============================================================================

// [TỪ KHÓA: "use server"]
// - Ý NGHĨA: Chỉ thị đặc biệt của Next.js, đánh dấu TOÀN BỘ file này là Server Actions.
// - TÁC DỤNG: Mọi hàm export trong file chỉ chạy trên Server, không bao giờ bị gửi
//   xuống trình duyệt. An toàn cho code chứa truy vấn DB.
// - CÁCH KHÁC: Tạo API Route (app/api/admin/route.ts) + fetch() từ Client. Nhược điểm:
//   code dài hơn, phải quản lý loading state thủ công. "use server" gọn hơn nhiều.
"use server";

// [TỪ KHÓA: import { revalidatePath } from "next/cache"]
// - Ý NGHĨA: Hàm xóa bộ nhớ đệm (Cache) của Next.js theo đường dẫn.
// - TẠI SAO DÙNG: Sau khi Admin sửa/xóa dữ liệu, trang /admin và trang chủ / vẫn
//   hiển thị bản cũ do cache. revalidatePath() ra lệnh "xóa cache, lấy dữ liệu mới".
// - VD: revalidatePath("/admin") → lần load tới của /admin sẽ truy vấn DB thay vì
//   dùng HTML đã cache.
import { revalidatePath } from "next/cache";

// [TỪ KHÓA: import { db } from "@/lib/db"]
// - Ý NGHĨA: Đối tượng kết nối SQLite (better-sqlite3) đã được khởi tạo ở lib/db.ts.
// - TẠI SAO DÙNG: Hầu hết action trong file này chỉ cần chạy 1 câu SQL đơn giản
//   (INSERT/UPDATE/DELETE), không cần tách sang lib/books.ts như updateFullBook.
// - DẤU @/ : Path Alias trỏ đến thư mục gốc dự án (tránh viết ../../lib/db).
import { db } from "@/lib/db";

// [TỪ KHÓA: import { updateFullBook } from "@/lib/books"]
// - Ý NGHĨA: Hàm xử lý cập nhật sách phức tạp (đồng bộ cả bảng books, book_authors,
//   book_categories trong 1 transaction).
// - TẠI SAO IMPORT RIÊNG: Vì logic sửa sách phức tạp hơn các bảng khác (phải xóa và
//   chèn lại các liên kết tác giả/thể loại), nên nó được tách riêng trong lib/books.ts
//   để tái sử dụng. Ở đây chỉ cần gọi lại, không viết lại SQL.
import { updateFullBook } from "@/lib/books";

// [TỪ KHÓA: import { randomUUID } from "node:crypto"]
// - Ý NGHĨA: Hàm sinh UUID v4 ngẫu nhiên (VD: 550e8400-e29b-41d4-a716-446655440000).
// - TẠI SAO DÙNG: Các bảng users/categories/authors dùng TEXT PRIMARY KEY, cần ID
//   duy nhất. UUID đảm bảo không trùng dù tạo hàng triệu bản ghi.
// - CÁCH KHÁC: Dùng AUTOINCREMENT (số tăng dần). Nhược điểm: khi migrate/merge DB
//   dễ trùng ID. UUID an toàn hơn cho hệ phân tán.
import { randomUUID } from "node:crypto";

// ============================================================================
// HÀM TIỆN ÍCH (HELPERS)
// ============================================================================

// [HÀM: getText]
// - Ý NGHĨA: Lấy giá trị chuỗi từ FormData, đã trim khoảng trắng 2 đầu.
// - TẠI SAO DÙNG:
//   + formData.get() có thể trả về string | File | null. Ta chỉ muốn string.
//   + Dùng typeof check để tránh lỗi khi .trim() trên null/File.
//   + Gom logic vào 1 chỗ → các action bên dưới code gọn hơn nhiều.
function getText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// ============================================================================
// 1. QUẢN LÝ SÁCH (BOOKS)
// ============================================================================

// [HÀM: updateBookAdminAction]
// - Ý NGHĨA: Admin sửa thông tin sách (tên, năm XB, ảnh bìa, tác giả, thể loại).
// - TẠI SAO KHÔNG VIẾT SQL Ở ĐÂY: Vì sửa sách cần đồng bộ 3 bảng (books, book_authors,
//   book_categories) trong 1 transaction → phức tạp → tách sang lib/books.ts.
export async function updateBookAdminAction(formData: FormData) {
  // 1. LẤY DỮ LIỆU TỪ FORM
  const bookId = getText(formData, "bookId");
  const title = getText(formData, "title");
  const publishedYear = Number(getText(formData, "publishedYear"));
  const thumbnail = getText(formData, "thumbnail") || null; // Rỗng → null (để DB lưu NULL)
  const authors = getText(formData, "authors");
  const categories = getText(formData, "categories");

  // 2. VALIDATE
  // ID và tên là bắt buộc, thiếu là dừng ngay.
  if (!bookId || !title) throw new Error("Thiếu ID hoặc Tên sách.");

  // 3. GỌI HÀM SQL PHỨC TẠP
  await updateFullBook(bookId, {
    title,
    publishedYear: isNaN(publishedYear) ? null : publishedYear,
    thumbnail,
    // [TỪ KHÓA: .split(",").map(...).filter(Boolean)]
    // - Ý NGHĨA: "Robert, Andrew" → ["Robert", "Andrew"] → cắt khoảng trắng → bỏ rỗng.
    // - TẠI SAO PHẢI SPLIT: MultiSelectAutocomplete render mỗi tác giả thành 1 thẻ
    //   <input type="hidden" name="authors" value="...">. Khi submit, formData.get("authors")
    //   chỉ trả về giá trị ĐẦU TIÊN. Để lấy hết, ta dùng getAll — nhưng ở đây
    //   AdminDashboard lại join các giá trị bằng dấu phẩy trước khi gửi, nên phải split.
    authors: authors.split(",").map(a => a.trim()).filter(Boolean),
    categories: categories.split(",").map(c => c.trim()).filter(Boolean)
  });

  // 4. XÓA CACHE để trang admin và trang chủ load lại danh sách mới.
  revalidatePath("/admin");
  revalidatePath("/");
}

// [HÀM: deleteBookAdminAction]
// - Ý NGHĨA: Admin xóa sách khỏi thư viện.
// - LƯU Ý VỀ CASCADE: Các bảng book_authors, book_categories, user_books, reviews đều
//   có FOREIGN KEY ... ON DELETE CASCADE → xóa sách tự động xóa hết dữ liệu liên quan.
//   Không cần xóa thủ công từng bảng.
export async function deleteBookAdminAction(formData: FormData) {
  const bookId = getText(formData, "bookId");
  if (!bookId) throw new Error("Thiếu ID sách.");
  db.prepare(`DELETE FROM books WHERE id = ?`).run(bookId);
  revalidatePath("/admin");
  revalidatePath("/");
}

// ============================================================================
// 2. QUẢN LÝ NGƯỜI DÙNG (USERS)
// ============================================================================

// [HÀM: createUserAction]
// - Ý NGHĨA: Admin tạo user mới. Hệ thống KHÔNG có mật khẩu — đăng nhập chỉ bằng email.
export async function createUserAction(formData: FormData) {
  const name = getText(formData, "name");
  const email = getText(formData, "email");
  // Nếu form không gửi role, mặc định là USER (không cho tạo ADMIN ngoài ý muốn).
  const role = getText(formData, "role") || "USER";

  if (!name || !email) throw new Error("Tên và Email không được để trống.");

  try {
    db.prepare(`INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)`)
      .run(randomUUID(), name, email, role);
    revalidatePath("/admin");
  } catch (error) {
    // [TẠI SAO CATCH]: Cột email có UNIQUE constraint. Nếu email đã tồn tại, SQLite
    // ném lỗi "UNIQUE constraint failed: users.email". Ta bắt và đổi thành thông
    // báo tiếng Việt dễ hiểu cho admin.
    throw new Error("Email này đã tồn tại trong hệ thống.");
  }
}

// [HÀM: updateUserAction]
// - Ý NGHĨA: Admin sửa tên và role của user.
// - LƯU Ý: KHÔNG cho sửa email. Lý do: email là định danh đăng nhập, đổi email sẽ
//   làm hỏng phiên đăng nhập hiện tại của user đó. Muốn đổi email → xóa tạo lại.
export async function updateUserAction(formData: FormData) {
  const userId = getText(formData, "userId");
  const name = getText(formData, "name");
  const role = getText(formData, "role");

  if (!userId || !name) throw new Error("Thiếu thông tin.");

  db.prepare(`UPDATE users SET name = ?, role = ? WHERE id = ?`).run(name, role, userId);
  revalidatePath("/admin");
}

// [HÀM: deleteUserAdminAction]
// - Ý NGHĨA: Admin xóa user.
// - LƯU Ý: Nhờ ON DELETE CASCADE, toàn bộ user_books và reviews của user cũng bị xóa.
//   Nhưng nếu user đang có cookie `user_session` thì cookie đó sẽ trỏ đến ID không tồn
//   tại → action updateShelfAction/saveReviewAction sẽ tự phát hiện và yêu cầu đăng nhập lại.
export async function deleteUserAdminAction(formData: FormData) {
  const userId = getText(formData, "userId");
  if (!userId) throw new Error("Thiếu ID người dùng.");
  db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
  revalidatePath("/admin");
}

// ============================================================================
// 3. QUẢN LÝ THỂ LOẠI (CATEGORIES)
// ============================================================================

// [HÀM: createCategoryAction]
// - Ý NGHĨA: Admin thêm thể loại mới (VD: "Khoa học viễn tưởng").
export async function createCategoryAction(formData: FormData) {
  const name = getText(formData, "name");
  if (!name) throw new Error("Tên thể loại không được để trống.");

  try {
    db.prepare(`INSERT INTO categories (id, name) VALUES (?, ?)`).run(randomUUID(), name);
    revalidatePath("/admin");
  } catch (error) {
    // Cột name của categories có UNIQUE → trùng tên sẽ lỗi.
    throw new Error("Thể loại này đã tồn tại.");
  }
}

// [HÀM: updateCategoryAction]
// - Ý NGHĨA: Admin đổi tên thể loại.
// - LƯU Ý: Đổi tên không ảnh hưởng đến book_categories (vì liên kết dựa trên category_id,
//   không dựa trên tên). Sách thuộc thể loại này vẫn giữ nguyên liên kết.
export async function updateCategoryAction(formData: FormData) {
  const categoryId = getText(formData, "categoryId");
  const name = getText(formData, "name");
  if (!categoryId || !name) throw new Error("Thiếu thông tin.");

  db.prepare(`UPDATE categories SET name = ? WHERE id = ?`).run(name, categoryId);
  revalidatePath("/admin");
}

// [HÀM: deleteCategoryAction]
// - Ý NGHĨA: Admin xóa thể loại.
// - LƯU Ý: ON DELETE CASCADE ở book_categories sẽ tự xóa các dòng liên kết, nhưng
//   KHÔNG xóa sách — sách vẫn tồn tại, chỉ không còn thuộc thể loại này nữa.
export async function deleteCategoryAction(formData: FormData) {
  const categoryId = getText(formData, "categoryId");
  if (!categoryId) throw new Error("Thiếu ID thể loại.");
  db.prepare(`DELETE FROM categories WHERE id = ?`).run(categoryId);
  revalidatePath("/admin");
}

// ============================================================================
// 4. QUẢN LÝ TÁC GIẢ (AUTHORS)
// ============================================================================

// [HÀM: createAuthorAction]
// - Ý NGHĨA: Admin thêm tác giả mới.
export async function createAuthorAction(formData: FormData) {
  const name = getText(formData, "name");
  if (!name) throw new Error("Tên tác giả không được để trống.");

  try {
    db.prepare(`INSERT INTO authors (id, name) VALUES (?, ?)`).run(randomUUID(), name);
    revalidatePath("/admin");
  } catch (error) {
    // Cột name của authors có UNIQUE → trùng tên sẽ lỗi.
    throw new Error("Tác giả này đã tồn tại.");
  }
}

// [HÀM: updateAuthorAction]
// - Ý NGHĨA: Admin đổi tên tác giả.
// - LƯU Ý: Giống categories — đổi tên không ảnh hưởng đến book_authors (liên kết dựa
//   trên author_id, không dựa trên tên).
export async function updateAuthorAction(formData: FormData) {
  const authorId = getText(formData, "authorId");
  const name = getText(formData, "name");
  if (!authorId || !name) throw new Error("Thiếu thông tin.");

  db.prepare(`UPDATE authors SET name = ? WHERE id = ?`).run(name, authorId);
  revalidatePath("/admin");
}

// [HÀM: deleteAuthorAction]
// - Ý NGHĨA: Admin xóa tác giả.
// - LƯU Ý: ON DELETE CASCADE xóa liên kết trong book_authors, nhưng sách vẫn tồn tại
//   (chỉ mất tên tác giả khỏi sách đó).
export async function deleteAuthorAction(formData: FormData) {
  const authorId = getText(formData, "authorId");
  if (!authorId) throw new Error("Thiếu ID tác giả.");
  db.prepare(`DELETE FROM authors WHERE id = ?`).run(authorId);
  revalidatePath("/admin");
}

// ============================================================================
// 5. QUẢN LÝ ĐÁNH GIÁ (REVIEWS)
// ============================================================================

// [HÀM MỚI: updateReviewAdminAction]
// - Ý NGHĨA: Admin sửa review (chỉ rating + content).
// - TẠI SAO CHỈ CHO SỬA 2 CỘT:
//   + `user_id`: đổi = biến review của A thành review của B → sai ngữ nghĩa.
//     Nếu muốn "chuyển" review sang user khác thì xóa review cũ, user mới tự tạo lại.
//   + `book_id`: tương tự, review thuộc về 1 cuốn sách cụ thể.
//   + `created_at`: mốc lịch sử (lúc user viết). Admin không nên sửa để giữ tính
//     minh bạch thời gian.
// - TẠI SAO KHÔNG DÙNG UPSERT (INSERT ... ON CONFLICT): Vì đây là SỬA review đã có,
//   không phải thêm mới. Nếu dùng upsert, gõ sai reviewId có thể vô tình tạo review
//   mới → sai. UPDATE thuần an toàn hơn.
export async function updateReviewAdminAction(formData: FormData) {
  // 1. LẤY DỮ LIỆU TỪ FORM
  const reviewId = getText(formData, "reviewId");
  const ratingText = getText(formData, "rating");
  const content = getText(formData, "content");

  // 2. VALIDATE ID
  if (!reviewId) throw new Error("Thiếu ID đánh giá.");

  // 3. VALIDATE RATING
  // [TỪ KHÓA: Number.isInteger()]
  // - Ý NGHĨA: Kiểm tra số nguyên (VD: "3.5" sẽ fail, "abc" → NaN → fail).
  // - TẠI SAO PHẢI CHECK 1-5: Bảng reviews có CHECK (rating BETWEEN 1 AND 5).
  //   Nếu để SQLite bắt lỗi, thông báo sẽ khó hiểu ("CHECK constraint failed").
  //   Validate ở đây trước → báo tiếng Việt thân thiện hơn.
  const rating = Number(ratingText);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Số sao phải là số nguyên từ 1 đến 5.");
  }

  // 4. UPDATE DATABASE
  const result = db
    .prepare(`UPDATE reviews SET rating = ?, content = ? WHERE id = ?`)
    .run(rating, content, reviewId);

  // [TỪ KHÓA: result.changes]
  // - Ý NGHĨA: Số dòng thực sự bị UPDATE ảnh hưởng.
  // - TẠI SAO KIỂM TRA: Nếu reviewId không tồn tại (review vừa bị xóa ở tab khác),
  //   UPDATE sẽ chạy thành công nhưng changes = 0 → ta phải báo lỗi để admin biết.
  //   Nếu không check, admin tưởng đã sửa được nhưng thực ra chẳng có gì thay đổi.
  if (result.changes === 0) {
    throw new Error("Đánh giá này không còn tồn tại. Vui lòng tải lại trang.");
  }

  // 5. XÓA CACHE để trang admin và trang chủ hiển thị review mới.
  revalidatePath("/admin");
  revalidatePath("/");
}

// [HÀM: deleteReviewAdminAction]
// - Ý NGHĨA: Admin xóa review.
// - LƯU Ý: Đây là thao tác "cứng" — sau khi xóa không hoàn tác được. Review không có
//   cột "deleted_at" để soft delete. Nếu cần khôi phục, phải backup DB trước.
export async function deleteReviewAdminAction(formData: FormData) {
  const reviewId = getText(formData, "reviewId");
  if (!reviewId) throw new Error("Thiếu ID đánh giá.");
  db.prepare(`DELETE FROM reviews WHERE id = ?`).run(reviewId);
  revalidatePath("/admin");
  revalidatePath("/");
}