// ============================================================================
// FILE: lib/books.ts (Người thủ thư - Chứa toàn bộ câu lệnh SQL)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// File này đóng vai trò là "Người thủ thư" của ứng dụng. Giao diện (React) không 
// được phép trực tiếp viết câu lệnh SQL (vì sẽ rất rối và dễ bị hack SQL Injection).
// Thay vào đó, giao diện sẽ gọi các hàm trong file này.
//
// [TÁC DỤNG]:
// - Lấy danh sách sách (kèm tác giả, thể loại, điểm đánh giá).
// - Thêm sách mới, Cập nhật sách, Xóa sách.
// - Cập nhật kệ sách (User) và Lưu đánh giá (User).
//
// [SỰ THAY ĐỔI LỚN NHẤT SO VỚI BẢN CŨ]:
// - Ở bản cũ, khi Admin thêm sách, nếu gõ một tác giả mới, hệ thống tự động tạo 
//   tác giả đó luôn (getOrCreateAuthor).
// - Ở bản này, ta ÉP BUỘC Admin phải vào tab "Tác giả" để tạo trước. Nếu khi thêm 
//   sách mà gõ một tác giả không có trong Database, hàm sẽ NÉM RA LỖI (throw Error).
//   Điều này giúp dữ liệu không bị rác (tránh việc "Robert Martin" và "robert martin" 
//   bị tách thành 2 tác giả khác nhau).
// ============================================================================

// [TỪ KHÓA: import "server-only"]
// - Ý NGHĨA: Một gói bảo mật của Next.js.
// - TÁC DỤNG: Chặn không cho Client Component (giao diện) import file này. Đảm bảo các câu lệnh SQL không bao giờ bị gửi xuống trình duyệt.
import "server-only";

// [TỪ KHÓA: import { randomUUID } from "node:crypto"]
// - Ý NGHĨA: Hàm tạo mã ID ngẫu nhiên (UUID).
// - TẠI SAO DÙNG: Mỗi sách, mỗi review khi tạo ra cần một ID duy nhất không trùng lặp.
// - CÁCH KHÁC: Dùng số tự tăng (1, 2, 3). Nhược điểm: Dễ bị đoán ID, và nếu gộp dữ liệu từ 2 hệ thống sẽ bị trùng.
import { randomUUID } from "node:crypto";

// [TỪ KHÓA: import { db } from "@/lib/db"]
// - Ý NGHĨA: Import đối tượng kết nối cơ sở dữ liệu SQLite (đã tạo ở File 1).
import { db } from "@/lib/db";

// ============================================================================
// PHẦN 1: ĐỊNH NGHĨA KIỂU DỮ LIỆU (TYPES)
// ============================================================================

// [TỪ KHÓA: export type Shelf]
// - Ý NGHĨA: Định nghĩa một kiểu dữ liệu giới hạn (Union Type).
// - TẠI SAO DÙNG: Đảm bảo biến "shelf" chỉ được phép nhận 1 trong 4 giá trị này. 
//   Nếu lỡ tay truyền "dang_doc", TypeScript sẽ báo lỗi đỏ ngay.
export type Shelf = "want_to_read" | "reading" | "read" | "none";

// Định nghĩa cấu trúc dữ liệu trả về cho giao diện
export type BookListItem = {
  id: string;
  title: string;
  isbn: string | null;
  published_year: number | null;
  thumbnail: string | null;
  authors: string;           // Sẽ gộp mảng tác giả thành 1 chuỗi "A, B"
  categories: string;        // Sẽ gộp mảng thể loại thành 1 chuỗi "X, Y"
  shelf: Shelf | null;       // Có thể null nếu user chưa xếp kệ
  avg_rating: number | null;
  my_rating: number | null;
  my_review: string | null;
};

// ============================================================================
// PHẦN 2: HÀM LẤY DỮ LIỆU (READ)
// ============================================================================

// [HÀM: listBooksForUser]
// - Ý NGHĨA: Lấy toàn bộ sách kèm theo tác giả, thể loại, điểm đánh giá.
// ============================================================================
// HÀM: listBooksForUser (ĐÃ SỬA — trả về kèm reviews và avgRating)
// ============================================================================
// [TẠI SAO SỬA]:
// - Trước đây hàm chỉ SELECT bảng books, không lấy review → BookCard không có
//   dữ liệu để hiển thị → trang chủ "có review trong DB nhưng không hiện ra".
// - Bây giờ: query thêm bảng reviews (JOIN users để lấy tên), group theo book_id,
//   gắn vào từng cuốn sách dưới dạng mảng `reviews` + điểm trung bình `avgRating`.
// ============================================================================
// ============================================================================
// HÀM: listBooksForUser (ĐÃ CẬP NHẬT TÍNH NĂNG TÌM KIẾM)
// ============================================================================
// [Ý NGHĨA]:
// - Lấy danh sách sách cho một User cụ thể. Kèm theo thông tin tác giả, kệ sách,
//   điểm đánh giá trung bình, và danh sách các review.
// - [MỚI]: Hỗ trợ tìm kiếm thông qua tham số `searchQuery`. Nếu có từ khóa,
//   chỉ trả về những sách có Tên, ISBN hoặc Tên Tác giả khớp với từ khóa.
// ============================================================================
// ============================================================================
// HÀM: listBooksForUser (ĐÃ CẬP NHẬT TÍNH NĂNG TÌM KIẾM)
// ============================================================================
// [Ý NGHĨA]: Lấy danh sách sách cho một User cụ thể. 
// [MỚI]: Hỗ trợ tìm kiếm thông qua tham số `searchQuery`.
export function listBooksForUser(userId: string, searchQuery?: string) {
  // 1. KHỞI TẠO CÂU LỆNH SQL CƠ BẢN
  // - Dùng biến `let` vì câu lệnh này sẽ được nối thêm (nếu có tìm kiếm).
  let query = `
    SELECT 
      b.*, -- Lấy tất cả các cột của bảng books
      -- [SUBQUERY]: Lấy tên các tác giả, nối chúng lại bằng dấu phẩy
      (SELECT GROUP_CONCAT(a.name, ', ') 
       FROM book_authors ba 
       JOIN authors a ON a.id = ba.author_id 
       WHERE ba.book_id = b.id) as authors,
      -- Lấy trạng thái kệ sách (nếu user đã xếp sách vào kệ)
      ub.shelf
    FROM books b
    -- Dùng LEFT JOIN để nếu user chưa xếp sách vào kệ nào thì sách vẫn hiện ra
    LEFT JOIN user_books ub ON ub.book_id = b.id AND ub.user_id = ?
  `;

  // [TỪ KHÓA: Mảng params]
  // - Dùng để chứa các giá trị truyền vào dấu hỏi chấm (?) trong câu lệnh SQL.
  // - Mặc định luôn có userId ở vị trí đầu tiên (cho dấu ? ở LEFT JOIN phía trên).
  const params: any[] = [userId];

  // 2. XỬ LÝ TÌM KIẾM (NẾU CÓ TỪ KHÓA)
  // - Kiểm tra xem searchQuery có tồn tại và không phải chuỗi rỗng.
  if (searchQuery && searchQuery.trim() !== "") {
    // [TỪ KHÓA: %...%] 
    // - Dấu % đại diện cho bất kỳ ký tự nào. 
    // - VD: "%Clean%" khớp với "Clean Code", "Very Clean"...
    const searchTerm = `%${searchQuery.trim()}%`;
    
    // Nối thêm mệnh đề WHERE vào câu SQL cũ
    query += `
      WHERE b.title LIKE ?    -- Tìm theo Tên sách
         OR b.isbn LIKE ?     -- HOẶC Tìm theo ISBN
         OR b.id IN (         -- HOẶC Sách có ID nằm trong danh sách tác giả khớp
           SELECT ba.book_id FROM book_authors ba 
           JOIN authors a ON a.id = ba.author_id 
           WHERE a.name LIKE ? -- Tìm theo Tên tác giả
         )
    `;
    // [TỪ KHÓA: params.push()]
    // - Thêm 3 từ khóa tương ứng với 3 dấu ? (title, isbn, author name).
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // 3. SẮP XẾP VÀ THỰC THI
  // - Nối thêm lệnh sắp xếp mới nhất lên đầu.
  query += ` ORDER BY b.created_at DESC`;
  
  // [TỪ KHÓA: ...params (Spread Operator)]
  // - Dấu ... dùng để "trải" mảng ra. VD: [userId, term, term, term]
  // - Truyền các giá trị này vào để thay thế cho các dấu ? trong SQL.
  const books = db.prepare(query).all(...params) as any[];

  // ==========================================================================
  // 4. LẤY VÀ GẮN ĐÁNH GIÁ (REVIEWS) - Giữ nguyên logic cũ
  // ==========================================================================
  // - Lấy toàn bộ review trong 1 lần query (tránh N+1 query).
  const allReviews = db.prepare(`
    SELECT 
      r.id, r.user_id, r.book_id, r.rating, r.content, r.created_at,
      u.name as userName
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
  `).all() as any[];

  // - Duyệt qua từng cuốn sách để tính điểm TB và gắn mảng review vào.
  return books.map((book) => {
    // Lọc ra các review thuộc về cuốn sách hiện tại.
    const bookReviews = allReviews.filter((r) => r.book_id === book.id);
    
    // Tính điểm trung bình: Tổng điểm / Số lượng review.
    // - .toFixed(1) để làm tròn 1 chữ số thập phân (VD: 4.5).
    // - Number(...) để chuyển từ chuỗi "4.5" về số 4.5.
    const avgRating = bookReviews.length > 0
      ? Number((bookReviews.reduce((sum, r) => sum + r.rating, 0) / bookReviews.length).toFixed(1))
      : null;

    // Trả về object sách mới, có thêm 2 trường reviews và avgRating.
    return {
      ...book,
      reviews: bookReviews,
      avgRating,
    };
  });
}
// ============================================================================
// PHẦN 3: HÀM HỖ TRỢ (CHỈ TÌM ID, KHÔNG TẠO MỚI)
// ============================================================================

// [HÀM: getAuthorId]
// - Ý NGHĨA: Tìm ID của tác giả dựa vào tên.
// - TẠI SAO KHÔNG TỰ TẠO MỚI: Để đảm bảo dữ liệu sạch. Admin phải thêm tác giả ở tab "Tác giả" trước, sau đó mới được phép gắn vào sách.
function getAuthorId(name: string): string {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Tên tác giả không được để trống.");
  
  // [TỪ KHÓA: .get()]
  // - Ý NGHĨA: Lấy dòng dữ liệu đầu tiên khớp với điều kiện (WHERE name = ?).
  const row = db.prepare(`SELECT id FROM authors WHERE name = ? COLLATE NOCASE`)
    .get(cleanName) as { id: string } | undefined;
    
  // [TỪ KHÓA: throw new Error()]
  // - Ý NGHĨA: Ném ra lỗi và dừng chương trình.
  // - TẠI SAO DÙNG: Nếu không tìm thấy tác giả, ta báo lỗi để Frontend biết và hiển thị thông báo cho Admin.
  if (!row) {
    throw new Error(`Tác giả "${cleanName}" chưa tồn tại trong hệ thống. Vui lòng vào tab Tác giả để thêm mới trước.`);
  }
  return row.id;
}

// [HÀM: getCategoryId]
// - Ý NGHĨA: Tương tự getAuthorId, nhưng dùng cho Thể loại.
function getCategoryId(name: string): string {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Tên thể loại không được để trống.");
  const row = db.prepare(`SELECT id FROM categories WHERE name = ? COLLATE NOCASE`)
    .get(cleanName) as { id: string } | undefined;
  if (!row) {
    throw new Error(`Thể loại "${cleanName}" chưa tồn tại trong hệ thống. Vui lòng vào tab Thể loại để thêm mới trước.`);
  }
  return row.id;
}

// ============================================================================
// PHẦN 4: THÊM SÁCH MỚI (CREATE)
// ============================================================================

export type CreateBookInput = {
  title: string;
  isbn: string | null;
  publishedYear: number | null;
  thumbnail: string | null;
  authorNames: string[];
  categoryNames: string[];
};

export function createBook(input: CreateBookInput): string {
  const title = input.title.trim();
  if (!title) throw new Error("Tên sách không được để trống.");

  // [TỪ KHÓA: db.transaction()]
  // - Ý NGHĨA: Gom các câu lệnh SQL lại thành 1 khối duy nhất (All or Nothing).
  // - TẠI SAO DÙNG: Ta phải chèn dữ liệu vào 3 bảng (books, book_authors, book_categories). 
  //   Nếu chèn sách thành công mà chèn tác giả bị lỗi (VD: tác giả không tồn tại), toàn bộ quá trình sẽ bị Rollback (hủy bỏ). 
  //   Nhờ vậy, Database sẽ không bao giờ có những cuốn sách "mồ côi" (không có tác giả).
  const transaction = db.transaction(() => {
    const id = randomUUID();
    
    // [TỪ KHÓA: .run()]
    // - Ý NGHĨA: Thực thi câu lệnh chèn (INSERT) và truyền các giá trị vào dấu (?).
    db.prepare(`INSERT INTO books (id, title, isbn, published_year, thumbnail) VALUES (?, ?, ?, ?, ?)`)
      .run(id, title, input.isbn?.trim() || null, input.publishedYear, input.thumbnail || null);

    // Duyệt qua mảng tên tác giả
    input.authorNames.map((name) => name.trim()).filter(Boolean)
      .forEach((name, index) => {
        // Gọi hàm getAuthorId. Nếu tên không có trong DB, hàm này sẽ throw Error và kích hoạt Rollback.
        const authorId = getAuthorId(name); 
        db.prepare(`INSERT OR IGNORE INTO book_authors (book_id, author_id, author_order) VALUES (?, ?, ?)`)
          .run(id, authorId, index + 1);
      });

    // Duyệt qua mảng tên thể loại
    input.categoryNames.map((name) => name.trim()).filter(Boolean)
      .forEach((name) => {
        const categoryId = getCategoryId(name);
        db.prepare(`INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES (?, ?)`)
          .run(id, categoryId);
      });

    return id;
  });

  // Kích hoạt Transaction
  return transaction();
}

// ============================================================================
// PHẦN 5: CẬP NHẬT SÁCH (UPDATE)
// ============================================================================

export function updateFullBook(bookId: string, data: any) {
  const transaction = db.transaction(() => {
    // 1. Cập nhật thông tin cơ bản của sách
    db.prepare(`UPDATE books SET title = ?, published_year = ?, thumbnail = ? WHERE id = ?`)
      .run(data.title, data.publishedYear, data.thumbnail, bookId);

    // 2. [CHIẾN LƯỢC CẬP NHẬT QUAN HỆ N-N]
    // - Xóa toàn bộ tác giả cũ của sách này.
    // - Sau đó thêm lại danh sách tác giả mới.
    // - TẠI SAO KHÔNG DÙNG UPDATE: Vì số lượng tác giả có thể thay đổi (từ 2 người thành 3 người). Việc Xóa đi Thêm lại dễ code và an toàn hơn nhiều.
    db.prepare(`DELETE FROM book_authors WHERE book_id = ?`).run(bookId);
    db.prepare(`DELETE FROM book_categories WHERE book_id = ?`).run(bookId);

    // Thêm lại tác giả mới
    data.authors.forEach((name: string, index: number) => {
      const authorId = getAuthorId(name);
      db.prepare(`INSERT INTO book_authors (book_id, author_id, author_order) VALUES (?, ?, ?)`)
        .run(bookId, authorId, index + 1);
    });

    // Thêm lại thể loại mới
    data.categories.forEach((name: string) => {
      const categoryId = getCategoryId(name);
      db.prepare(`INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)`)
        .run(bookId, categoryId);
    });
  });
  transaction();
}

// ============================================================================
// PHẦN 6: CÁC HÀM DÀNH CHO USER VÀ XÓA SÁCH
// ============================================================================

export function setUserShelf(userId: string, bookId: string, shelf: Shelf): void {
  const allowed: Shelf[] = ["want_to_read", "reading", "read", "none"];
  if (!allowed.includes(shelf)) throw new Error("Kệ sách không hợp lệ.");

  // [TỪ KHÓA: ON CONFLICT ... DO UPDATE]
  // - Ý NGHĨA: Upsert (Update + Insert).
  // - TẠI SAO DÙNG: Nếu user đã từng xếp cuốn sách này vào kệ rồi (bị trùng khóa chính user_id + book_id), 
  //   nó sẽ tự động chuyển sang lệnh UPDATE thay vì báo lỗi.
  db.prepare(`
    INSERT INTO user_books (user_id, book_id, shelf, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, book_id) DO UPDATE SET
      shelf = excluded.shelf,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, bookId, shelf);
}

export function saveReview(userId: string, bookId: string, rating: number, content: string): void {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Điểm đánh giá phải từ 1 đến 5.");
  }

  // Tương tự, dùng Upsert cho Review
  db.prepare(`
    INSERT INTO reviews (id, user_id, book_id, rating, content)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, book_id) DO UPDATE SET
      rating = excluded.rating,
      content = excluded.content,
      created_at = CURRENT_TIMESTAMP
  `).run(randomUUID(), userId, bookId, rating, content.trim());
}

export function deleteBook(bookId: string): void {
  // [TỪ KHÓA: DELETE FROM]
  // - Ý NGHĨA: Xóa vĩnh viễn dòng dữ liệu.
  // - LƯU Ý: Nhờ cơ chế ON DELETE CASCADE trong Database, khi sách bị xóa, 
  //   tất cả các dòng trong book_authors, book_categories, user_books, reviews cũng bị xóa theo.
  const result = db.prepare(`DELETE FROM books WHERE id = ?`).run(bookId);
  if (result.changes === 0) throw new Error("Không tìm thấy sách để xóa.");
}