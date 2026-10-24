// ============================================================================
// FILE: app/actions/books.ts
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// File này chứa các "Server Actions" (Hành động phía Server).
// Nó đóng vai trò là "Người điều phối" (Middleman) giữa Giao diện (Form HTML)
// và Database (các hàm SQL nằm trong file lib/books.ts).
//
// [TÁC DỤNG LÀM GÌ?]:
// - Nhận dữ liệu người dùng nhập từ Form (VD: Tên sách, Điểm đánh giá).
// - Kiểm tra (Validate) xem dữ liệu có hợp lệ không.
// - Lấy userId THẬT của người đang đăng nhập từ Cookie (không hardcode nữa).
// - Kiểm tra user_id và book_id có thực sự tồn tại trong DB trước khi ghi
//   vào bảng có FK (user_books, reviews) → tránh lỗi "FOREIGN KEY constraint failed".
// - Gọi các hàm SQL để lưu/thay đổi dữ liệu trong Database.
// - Xóa bộ nhớ đệm (Cache) để giao diện tự động cập nhật dữ liệu mới.
//
// [LỊCH SỬ SỬA]:
//  1) Trước đây file này hardcode `DEMO_USER_ID = "user-demo"`, khiến MỌI thao tác
//     (đổi kệ sách, gửi review) đều ghi vào tài khoản "user-demo" bất kể bạn đang
//     đăng nhập bằng tài khoản nào → "đổi kệ không lưu".
//     → Đã thay bằng `getCurrentUserId()` đọc từ cookie `user_session`.
//
//  2) Sau khi xóa data/ để fix lỗi created_at, DB mới trống nhưng cookie cũ vẫn
//     còn → action ghi user_id không tồn tại → SqliteError "FOREIGN KEY constraint
//     failed" tại setUserShelf/saveReview.
//     → Đã thêm `exists("users", id)` và `exists("books", id)` để validate trước,
//       kèm tự xóa cookie rác nếu user đã bị xóa.
// ============================================================================

// [TỪ KHÓA: "use server"]
// - Ý NGHĨA: Đây là một Directive (Chỉ thị) đặc biệt của Next.js.
// - TÁC DỤNG: Báo cho Next.js Compiler biết rằng TẤT CẢ các hàm export trong file này
//   CHỈ ĐƯỢC PHÉP CHẠY TRÊN SERVER (Backend). Tuyệt đối không gửi code này xuống trình duyệt.
// - TẠI SAO PHẢI DÙNG: File này chứa logic kết nối Database. Nếu không có "use server",
//   Next.js có thể cố gắng gửi code xuống trình duyệt, gây lỗi bảo mật và lỗi runtime.
"use server";

// [TỪ KHÓA: import { revalidatePath } from "next/cache"]
// - Ý NGHĨA: Import hàm xóa bộ nhớ đệm (Cache) của Next.js.
// - TÁC DỤNG: Next.js lưu sẵn HTML của trang vào Cache để tải cực nhanh.
//   Khi ta thay đổi DB, giao diện vẫn hiển thị bản cũ. Hàm này ra lệnh: "Xóa Cache đi, lấy dữ liệu mới!".
import { revalidatePath } from "next/cache";

// [TỪ KHÓA: import { cookies } from "next/headers"]
// - Ý NGHĨA: Hàm chuẩn của Next.js để đọc Cookie ở phía Server.
// - TẠI SAO DÙNG: Cần đọc cookie `user_session` (do loginAction tạo) để biết ai đang đăng nhập.
// - LƯU Ý NEXT.JS 15+: cookies() là hàm BẤT ĐỒNG BỘ, phải `await` trước khi dùng.
import { cookies } from "next/headers";

// [TỪ KHÓA: import { db } from "@/lib/db"]
// - Ý NGHĨA: Import đối tượng kết nối Database.
// - TẠI SAO DÙNG: Hàm `exists()` bên dưới cần query trực tiếp để kiểm tra tồn tại.
import { db } from "@/lib/db";

// [TỪ KHÓA: import { ... } from "@/lib/books"]
// - Ý NGHĨA: Import các hàm truy vấn SQL từ file lib/books.ts.
// - DẤU @/ : Là Path Alias (đường dẫn tắt) trỏ đến thư mục gốc dự án.
// - TỪ KHÓA `type Shelf`: Chỉ import kiểu dữ liệu (TypeScript Type), không import code chạy thực tế.
import { createBook, deleteBook, saveReview, setUserShelf, type Shelf } from "@/lib/books";

// ============================================================================
// PHẦN 2: CÁC HÀM TIỆN ÍCH (HELPERS)
// ============================================================================

// [HÀM: getText]
// - Ý NGHĨA: Lấy dữ liệu dạng chuỗi từ FormData, đã trim.
// - TẠI SAO DÙNG: Gom logic vào 1 chỗ, tránh lỗi crash nếu dữ liệu không phải chuỗi.
function getText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// [HÀM: splitNames]
// - Ý NGHĨA: Tách chuỗi "Robert, Andrew" → ["Robert", "Andrew"].
// - TẠI SAO DÙNG: Database cần lưu mảng, không lưu chuỗi có dấu phẩy.
function splitNames(value: string): string[] {
  return value.split(",").map((name) => name.trim()).filter(Boolean);
}

// [HÀM: getCurrentUserId] — đọc user thật từ cookie (đã bỏ DEMO_USER_ID)
// - Ý NGHĨA: Đọc cookie `user_session` để lấy ID người đang đăng nhập.
// - GIÁ TRỊ TRẢ VỀ:
//   + string: id người dùng đã đăng nhập
//   + null:   chưa đăng nhập, hoặc cookie hỏng/không hợp lệ
// - TẠI SAO `async`: `cookies()` ở Next.js 15+ là bất đồng bộ.
async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");
  if (!sessionCookie) return null;
  try {
    const session = JSON.parse(sessionCookie.value);
    return typeof session?.id === "string" && session.id ? session.id : null;
  } catch {
    return null;
  }
}

// [HÀM: exists] — KIỂM TRA ID CÓ TỒN TẠI TRONG BẢNG KHÔNG
// - Ý NGHĨA: Trả về true nếu `id` tồn tại trong `table`.
// - TẠI SAO DÙNG:
//   + Sau khi xóa data/ để fix schema, DB trống nhưng cookie cũ vẫn còn
//     → user_id trong cookie không có trong users → INSERT vào user_books
//     ném lỗi "FOREIGN KEY constraint failed".
//   + Sách bị admin xóa nhưng client vẫn còn cache cũ → book_id không còn
//     trong books → cùng lỗi FK.
//   Validate trước sẽ biến lỗi khó hiểu thành thông báo rõ ràng.
// - LƯU Ý BẢO MẬT: Tham số `table` là union literal ("users" | "books"),
//   KHÔNG nhận input từ người dùng → an toàn với SQL injection.
//   Nếu mở rộng, chỉ thêm tên bảng cố định vào union, đừng nhận string tùy ý.
function exists(table: "users" | "books", id: string): boolean {
  if (!id) return false;
  return !!db.prepare(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`).get(id);
}

// ============================================================================
// PHẦN 3: SERVER ACTIONS XỬ LÝ FORM
// ============================================================================

// [HÀM 1]: Xử lý thêm sách mới (chỉ Admin)
// - Ý NGHĨA: Hàm chạy khi Form "Thêm sách" được submit.
export async function createBookAction(formData: FormData) {
  // 1. LẤY DỮ LIỆU TỪ FORM
  const title = getText(formData, "title");
  const isbn = getText(formData, "isbn") || null; // Nếu rỗng thì gán null
  const thumbnail = getText(formData, "thumbnail") || null;
  const yearText = getText(formData, "publishedYear");

  // [TỪ KHÓA: Number()]
  // - Ý NGHĨA: Chuyển đổi kiểu dữ liệu từ chuỗi (string) sang số (number).
  const publishedYear = yearText ? Number(yearText) : null;

  // 2. VALIDATE (KIỂM TRA DỮ LIỆU)
  // [TỪ KHÓA: Number.isInteger()]
  // - Ý NGHĨA: Kiểm tra xem giá trị có phải là số nguyên không.
  if (yearText && (!Number.isInteger(publishedYear) || publishedYear! < 1000 || publishedYear! > 2100)) {
    throw new Error("Năm xuất bản phải là số nguyên hợp lệ.");
  }

  // 3. GỌI HÀM SQL (TỪ lib/books.ts)
  createBook({
    title, isbn, publishedYear, thumbnail,
    authorNames: splitNames(getText(formData, "authors")),
    categoryNames: splitNames(getText(formData, "categories")),
  });

  // 4. XÓA CACHE
  revalidatePath("/");
  revalidatePath("/admin");
}

// [HÀM 2]: Xử lý đổi kệ sách (ĐÃ SỬA — dùng userId từ cookie + validate FK)
export async function updateShelfAction(formData: FormData) {
  const bookId = getText(formData, "bookId");
  const shelfValue = getText(formData, "shelf");

  // 1. KIỂM TRA ĐĂNG NHẬP
  // Chưa đăng nhập → không có cookie → không biết ghi vào đâu → báo lỗi.
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Bạn cần đăng nhập để đổi kệ sách.");
  }

  // 2. [MỚI] VALIDATE FK: user phải còn tồn tại
  // Trường hợp gặp: DB đã reset (xóa data/) nhưng cookie trình duyệt vẫn còn phiên cũ.
  // Ở đây ta vừa xóa cookie vừa báo lỗi rõ ràng để user đăng nhập lại.
  if (!exists("users", userId)) {
    const cookieStore = await cookies();
    cookieStore.delete("user_session");
    throw new Error("Phiên đăng nhập không còn hợp lệ (tài khoản đã bị xóa). Vui lòng đăng nhập lại.");
  }

  // 3. [MỚI] VALIDATE FK: sách phải còn tồn tại
  // Trường hợp gặp: admin xóa sách nhưng client vẫn còn cache cũ.
  if (!exists("books", bookId)) {
    throw new Error("Sách này không còn tồn tại. Vui lòng tải lại trang.");
  }

  // 4. VALIDATE KỆ SÁCH
  // [TỪ KHÓA: .includes()]
  // - Ý NGHĨA: Kiểm tra giá trị có nằm trong mảng không.
  // - TẠI SAO DÙNG: Ngăn kẻ gian sửa HTML gửi kệ sách không hợp lệ.
  const allowed: Shelf[] = ["want_to_read", "reading", "read", "none"];
  if (!allowed.includes(shelfValue as Shelf)) {
    throw new Error("Dữ liệu kệ sách không hợp lệ.");
  }

  // 5. GHI VÀO DB VỚI userId THẬT
  setUserShelf(userId, bookId, shelfValue as Shelf);

  // 6. XÓA CACHE
  revalidatePath("/");
}

// [HÀM 3]: Xử lý gửi đánh giá (ĐÃ SỬA — dùng userId từ cookie + validate FK)
export async function saveReviewAction(formData: FormData) {
  const bookId = getText(formData, "bookId");
  const rating = Number(getText(formData, "rating"));
  const content = getText(formData, "content");

  // 1. KIỂM TRA ĐĂNG NHẬP
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Bạn cần đăng nhập để đánh giá sách.");
  }

  // 2. [MỚI] VALIDATE FK: user phải còn tồn tại
  if (!exists("users", userId)) {
    const cookieStore = await cookies();
    cookieStore.delete("user_session");
    throw new Error("Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.");
  }

  // 3. [MỚI] VALIDATE FK: sách phải còn tồn tại
  if (!exists("books", bookId)) {
    throw new Error("Sách này không còn tồn tại. Vui lòng tải lại trang.");
  }

  // 4. VALIDATE RATING
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Số sao phải là số nguyên từ 1 đến 5.");
  }

  // 5. GHI VÀO DB VỚI userId THẬT
  // - TẠI SAO UPSERT: Nếu user đã review thì UPDATE, chưa thì INSERT.
  saveReview(userId, bookId, rating, content);

  // 6. XÓA CACHE
  revalidatePath("/");
  revalidatePath("/admin");
}

// [HÀM 4]: Xử lý xóa sách (chỉ Admin)
// - Ý NGHĨA: Admin xóa một cuốn sách khỏi thư viện.
// - LƯU Ý: Middleware đã chặn /admin, nhưng nếu muốn chặt chẽ hơn,
//   có thể đọc cookie ở đây và kiểm tra role === "ADMIN" trước khi xóa.
export async function deleteBookAction(formData: FormData) {
  const bookId = getText(formData, "bookId");
  if (!bookId) throw new Error("Thiếu ID sách.");

  // [TỪ KHÓA: deleteBook(bookId)]
  // - Ý NGHĨA: Gọi hàm deleteBook từ lib/books.ts để chạy lệnh DELETE FROM books...
  // - CASCADE: các dòng liên quan trong book_authors, book_categories,
  //   user_books, reviews sẽ tự động bị xóa theo (nhờ FOREIGN KEY ON DELETE CASCADE).
  deleteBook(bookId);

  // Xóa cache của cả 2 trang để cập nhật danh sách sách mới.
  revalidatePath("/");
  revalidatePath("/admin");
}