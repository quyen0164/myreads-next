// scripts/seed-driver.ts

// ============================================================================
// 📌 QUY TRÌNH CHẠY LẠI SEED (mỗi khi đổi schema hoặc muốn reset dữ liệu mẫu)
// ============================================================================
//
//   PowerShell (Windows):
//     rm -r -fo data
//     npm run seed
//     npm run dev
//
//   Bash / macOS / Linux:
//     rm -rf data
//     npm run seed
//     npm run dev
//
// GIẢI THÍCH:
//   1. rm -r -fo data   → Xóa sạch thư mục data/ (file .db + .db-wal + .db-shm).
//                          Bắt buộc phải xóa trước khi seed, vì nếu file .db cũ
//                          còn tồn tại thì CREATE TABLE IF NOT EXISTS sẽ BỎ QUA
//                          việc nâng cấp schema → dễ sinh lỗi "no such column".
//   2. npx tsx scripts/seed-driver.ts     → Chạy file này: DROP toàn bộ bảng → CREATE lại → bơm
//                          dữ liệu mẫu (users, books, authors, reviews, ...).
//   3. npm run dev      → Khởi động Next.js. openDatabase() trong lib/db.ts
//                          cũng sẽ chạy CREATE TABLE IF NOT EXISTS (no-op vì
//                          bảng đã có sẵn từ bước seed).
//
// ⚠️ LƯU Ý: Nếu chỉ sửa schema mà KHÔNG xóa data/ trước, seeder vẫn DROP rồi
//    CREATE lại nên vẫn đúng. Nhưng nếu chỉ chạy `npm run dev` mà KHÔNG seed
//    lại, thì bảng cũ trong file .db sẽ giữ schema cũ → lỗi.
//
// ⚠️ LƯU Ý 2: Khi thêm cột mới vào bảng, phải sửa ĐỒNG THỜI cả:
//    - lib/db.ts            (hàm openDatabase → CREATE TABLE)
//    - scripts/seed-driver.ts (hàm createTables → CREATE TABLE)
//    Nếu chỉ sửa 1 bên, schema sẽ bị lệch → lỗi runtime.
// ============================================================================

// ============================================================================
// GIỚI THIỆU CHUNG VỀ FILE NÀY (SEEDER)
// ============================================================================
// Mục đích: File này dùng để "gieo hạt" (Seed) - tức là tạo ra dữ liệu mẫu ban đầu.
// Khi bạn mới xây dựng một Database, nó hoàn toàn trống rỗng. File này sẽ tự động thêm:
// - Tài khoản Admin và User.
// - Vài cuốn sách mẫu kèm ảnh bìa.
// - Thể loại, Tác giả, Đánh giá (Review).
// 
// ĐẶC BIỆT: File này chứa hàm resetDatabase() để tự động xóa các bảng cũ trước khi tạo mới. 
// Nhờ vậy, nếu bạn thay đổi cấu trúc bảng (như thêm cột role), bạn chỉ cần chạy lại file này mà không sợ bị lỗi "column does not exist".

// [KEYWORD: import ... from "node:crypto"]
// TẠI SAO DÙNG: Module crypto của Node.js cung cấp các hàm mã hóa. Ta dùng randomUUID để tạo ra các chuỗi ID ngẫu nhiên (VD: 550e8400-e29b-41d4...).
// TẠI SAO KHÔNG DÙNG SỐ TĂNG DẦN (1, 2, 3): Vì nếu bạn chạy seed nhiều lần, hoặc sau này mở rộng hệ thống, số ID rất dễ bị trùng lặp. UUID đảm bảo tính duy nhất toàn cầu.
import { randomUUID } from "node:crypto";

// [KEYWORD: import { db } from "../lib/db"]
// TẠI SAO DÙNG: Import đối tượng kết nối Database (đã được tạo ở File 1) sang đây để sử dụng.
// TẠI SAO DÙNG DẤU "../": Dấu ".." có nghĩa là "lùi ra ngoài 1 thư mục". File seed nằm trong thư mục scripts/, muốn vào lib/ ta phải lùi ra ngoài rồi mới vào lib.
import { db } from "../lib/db";

// ============================================================================
// PHẦN 1: HÀM TỰ ĐỘNG RESET DATABASE (XÓA BẢNG CŨ)
// ============================================================================
function resetDatabase() {
  console.log("🧹 Đang dọn dẹp Database cũ (Xóa các bảng)...");
  
  // [KEYWORD: db.exec()]
  // TẠI SAO DÙNG exec(): Hàm này cho phép chạy NHIỀU câu lệnh SQL cùng lúc (ngăn cách bởi dấu ;).
  // TẠI SAO KHÔNG DÙNG prepare(): prepare chỉ chạy được 1 câu lệnh và dùng để truyền tham số (?). Còn cấu trúc bảng tĩnh thì dùng exec() sẽ gọn hơn.
  db.exec(`
    -- [SQL]: Lệnh DROP TABLE dùng để xóa hoàn toàn một bảng.
    -- TẠI SAO PHẢI XÓA BẢNG CON TRƯỚC: Vì các bảng reviews, user_books, book_categories, book_authors đang chứa Khóa Ngoại (Foreign Key) trỏ đến bảng books và users. Nếu xóa bảng cha (books) trước, SQL sẽ báo lỗi "Foreign Key constraint failed".
    -- IF EXISTS: Giúp câu lệnh không bị lỗi nếu bảng đó chưa từng được tạo.
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS user_books;
    DROP TABLE IF EXISTS book_categories;
    DROP TABLE IF EXISTS book_authors;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS authors;
    DROP TABLE IF EXISTS books;
    DROP TABLE IF EXISTS users;
  `);
  console.log("✅ Đã dọn dẹp xong.");
}

// ============================================================================
// PHẦN 2: HÀM TẠO LẠI CẤU TRÚC BẢNG MỚI
// ============================================================================
function createTables() {
  console.log("🏗️ Đang tạo lại các bảng với cấu trúc mới...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      -- [KEYWORD: CHECK]: Ràng buộc dữ liệu đầu vào. Cột role CHỈ ĐƯỢC PHÉP nhận 'USER' hoặc 'ADMIN'.
      role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      isbn TEXT UNIQUE,
      published_year INTEGER,
      thumbnail TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS authors (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      bio TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS book_authors (
      book_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_order INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (book_id, author_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS book_categories (
      book_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      PRIMARY KEY (book_id, category_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_books (
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      shelf TEXT NOT NULL DEFAULT 'want_to_read' CHECK (shelf IN ('want_to_read', 'reading', 'read', 'none')),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, book_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, 
      UNIQUE (user_id, book_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);
  console.log("✅ Đã tạo xong cấu trúc bảng.");
}

// ============================================================================
// PHẦN 3: HÀM BƠM DỮ LIỆU MẪU (SEEDING)
// ============================================================================
function seedData() {
  console.log("⏳ Bắt đầu bơm dữ liệu mẫu...");

  // [KEYWORD: db.transaction()]
  // TẠI SAO DÙNG: Đây là tính năng cực kỳ quan trọng của SQL. Nó gom tất cả các lệnh INSERT bên trong thành 1 khối duy nhất (All or Nothing).
  // LÝ DO: Giả sử bạn chèn 3 cuốn sách, đến cuốn thứ 3 bị lỗi. Nếu KHÔNG có transaction, 2 cuốn đầu vẫn được lưu vào DB (rác dữ liệu). Nếu CÓ transaction, toàn bộ quá trình sẽ bị hủy (Rollback), DB giữ nguyên trạng thái sạch sẽ.
  // CÁCH KHÁC: Chạy từng lệnh INSERT rời rạc. Nhược điểm: Không đảm bảo tính toàn vẹn dữ liệu.
  const insertData = db.transaction(() => {
    
    // 1. TẠO USERS
    // [KEYWORD: db.prepare()]
    // TẠI SAO DÙNG: Biên dịch câu lệnh SQL trước. Dấu (?) đại diện cho các biến sẽ truyền vào sau.
    // TẠI SAO KHÔNG NỐI CHUỖI TRỰC TIẾP: Nếu nối chuỗi kiểu "INSERT ... VALUES ('" + name + "')", tin tặc có thể chèn mã độc gây lỗi SQL Injection. Dấu (?) vô hiệu hóa các ký tự nguy hiểm này.
    const insertUser = db.prepare(`INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)`);
    
    // [KEYWORD: .run()]
    // TẠI SAO DÙNG: Thực thi câu lệnh đã prepare, truyền các giá trị vào dấu (?) theo thứ tự.
    insertUser.run("admin-demo", "Quản trị viên", "admin@test.com", "ADMIN");
    insertUser.run("user-demo", "Người dùng", "user@test.com", "USER");

    // 2. TẠO AUTHORS VÀ CATEGORIES
    const insertAuthor = db.prepare(`INSERT INTO authors (id, name) VALUES (?, ?)`);
    insertAuthor.run("author-martin", "Robert C. Martin");
    insertAuthor.run("author-hunt", "Andrew Hunt");

    const insertCategory = db.prepare(`INSERT INTO categories (id, name) VALUES (?, ?)`);
    insertCategory.run("cat-programming", "Programming");
    insertCategory.run("cat-craftsmanship", "Software Craftsmanship");

    // 3. TẠO BOOKS (Có ảnh bìa)
    const insertBook = db.prepare(`INSERT INTO books (id, title, isbn, published_year, thumbnail) VALUES (?, ?, ?, ?, ?)`);
    insertBook.run("book-clean-code", "Clean Code", "9780132350884", 2008, "https://covers.openlibrary.org/b/id/135182-L.jpg");
    
    // CỐ TÌNH ĐỂ TRỐNG ẢNH (null) ĐỂ TEST: Xem giao diện có tự hiển thị ảnh mặc định khi sách không có ảnh không.
    insertBook.run("book-pragmatic", "The Pragmatic Programmer", "9780135957059", 2019, null);

    // 4. NỐI SÁCH - TÁC GIẢ (Quan hệ N-N)
    const insertBookAuthor = db.prepare(`INSERT INTO book_authors (book_id, author_id, author_order) VALUES (?, ?, ?)`);
    insertBookAuthor.run("book-clean-code", "author-martin", 1);
    insertBookAuthor.run("book-pragmatic", "author-hunt", 1);

    // 5. NỐI SÁCH - THỂ LOẠI (Quan hệ N-N)
    const insertBookCategory = db.prepare(`INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)`);
    insertBookCategory.run("book-clean-code", "cat-programming");
    insertBookCategory.run("book-pragmatic", "cat-craftsmanship");

    // 6. XẾP SÁCH VÀO KỆ CỦA USER
    const insertUserBook = db.prepare(`INSERT INTO user_books (user_id, book_id, shelf) VALUES (?, ?, ?)`);
    insertUserBook.run("user-demo", "book-clean-code", "reading");
    insertUserBook.run("user-demo", "book-pragmatic", "want_to_read");

    // 7. TẠO REVIEW
    const insertReview = db.prepare(`INSERT INTO reviews (id, user_id, book_id, rating, content) VALUES (?, ?, ?, ?, ?)`);
    // [KEYWORD: randomUUID()]
    // TẠI SAO DÙNG: Mỗi review cần một ID riêng. Hàm này tự sinh ra một chuỗi ngẫu nhiên để làm ID.
    insertReview.run(randomUUID(), "user-demo", "book-clean-code", 5, "Sách rất hay và thực tế.");
  });

  // Thực thi transaction
  insertData();
  console.log("✅ Bơm dữ liệu thành công!");
}

// ============================================================================
// PHẦN 4: CHẠY CHƯƠNG TRÌNH VÀ XỬ LÝ LỖI
// ============================================================================
// [KEYWORD: try...catch...finally]
// TẠI SAO DÙNG: 
// - try: Thử chạy các hàm. Nếu có lỗi, nhảy vào catch.
// - catch: In ra thông báo lỗi thay vì để chương trình bị crash (sập) đột ngột.
// - finally: LUÔN LUÔN chạy, dùng để dọn dẹp (đóng kết nối DB) dù thành công hay thất bại.
try {
  resetDatabase();
  createTables();
  seedData();
} catch (error) {
  console.error("❌ Có lỗi xảy ra:", error);
} finally {
  // [KEYWORD: db.close()]
  // TẠI SAO DÙNG: Đóng kết nối đến Database. Vì đây là script chạy xong rồi thoát, nếu không đóng, Node.js sẽ bị treo (không thoát ra được) vì nó cứ chờ kết nối Database.
  db.close();
}