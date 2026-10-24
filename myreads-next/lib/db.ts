// lib/db.ts

// ============================================================================
// PHẦN 1: IMPORT THƯ VIỆN VÀ THIẾT LẬP MÔI TRƯỜNG
// ============================================================================

// [KEYWORD: import "server-only"]
// TẠI SAO DÙNG: Đây là một "bùa hộ mệnh" của Next.js. Nó đảm bảo file này CHỈ ĐƯỢC CHẠY TRÊN SERVER, không bao giờ bị gửi xuống trình duyệt của người dùng.
// LÝ DO: File này chứa mật khẩu, đường dẫn database, nếu lộ ra client sẽ cực kỳ nguy hiểm.
// CÁCH KHÁC: Không có. Đây là best practice bắt buộc nếu bạn không muốn bị lỗi khi Next.js cố gắng build.
//import "server-only";

// [KEYWORD: import Database from "better-sqlite3"]
// TẠI SAO DÙNG better-sqlite3: Đây là thư viện giao tiếp với SQLite nhanh nhất hiện nay (viết bằng C++). Nó chạy đồng bộ (synchronous).
// CÁCH KHÁC: Dùng thư viện `sqlite3`. Nhược điểm: Nó chạy bất đồng bộ (callback/promise), khiến code phức tạp hơn. Với mục đích học tập, better-sqlite3 dễ hiểu hơn nhiều.
// @ts-ignore: Dòng này bảo TypeScript bỏ qua kiểm tra kiểu cho thư viện C++ này (vì đôi khi nó không tương thích hoàn hảo với TS).
// @ts-ignore
import Database from "better-sqlite3";

// [KEYWORD: import { mkdirSync } from "node:fs"]
// TẠI SAO DÙNG: Thư viện `fs` (File System) có sẵn của Node.js, dùng để làm việc với file và thư mục. `mkdirSync` là hàm tạo thư mục đồng bộ.
// CÁCH KHÁC: Dùng `mkdir` (bất đồng bộ). Nhưng ở đây ta cần tạo thư mục ngay lập tức trước khi kết nối DB, nên dùng `mkdirSync` hợp lý hơn.
import { mkdirSync } from "node:fs";

// [KEYWORD: import path from "node:path"]
// TẠI SAO DÙNG: Module `path` giúp nối các đoạn đường dẫn an toàn trên mọi hệ điều hành.
// VÍ DỤ: Trên Windows là `F:\data\db.sqlite`, trên Mac là `/data/db.sqlite`. Nếu bạn tự nối chuỗi bằng dấu `\` hay `/`, code sẽ bị lỗi khi chạy trên hệ điều hành khác.
import path from "node:path";

// ============================================================================
// PHẦN 2: XÁC ĐỊNH ĐƯỜNG DẪN LƯU DATABASE
// ============================================================================

// [KEYWORD: process.cwd()]
// TẠI SAO DÙNG: Viết tắt của "Current Working Directory" (Thư mục làm việc hiện tại). Nó trả về đường dẫn gốc của dự án khi bạn chạy lệnh.
// CÁCH KHÁC: Dùng `__dirname`. Nhược điểm: `__dirname` không hoạt động tốt trong môi trường ES Modules (Next.js hiện đại), nên `process.cwd()` là chuẩn.
const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "myreads-driver.db");

// [KEYWORD: mkdirSync(dataDir, { recursive: true })]
// TẠI SAO DÙNG: Tạo thư mục "data" nếu nó chưa tồn tại. 
// TẠI SAO CÓ { recursive: true }: Nếu thư mục cha (ví dụ ổ F) bị lỗi, nó sẽ tự động tạo cả các thư mục cha bị thiếu. Nếu không có cờ này, khi thư mục đã tồn tại, nó sẽ văng lỗi (Error).
mkdirSync(dataDir, { recursive: true });

// ============================================================================
// PHẦN 3: HÀM KẾT NỐI VÀ TẠO BẢNG (CORE FUNCTION)
// ============================================================================

function openDatabase() {
  // Khởi tạo kết nối tới file Database. Nếu file chưa có, SQLite sẽ tự động tạo ra một file trống.
  const connection = new Database(dbPath);

  // [KEYWORD: connection.pragma("foreign_keys = ON")]
  // TẠI SAO DÙNG: Mặc định SQLite TẮT tính năng kiểm tra khóa ngoại (Foreign Key). 
  // LÝ DO BẬT: Để đảm bảo tính toàn vẹn dữ liệu. Ví dụ: Không thể xóa một User nếu họ vẫn còn Sách trong kệ (nếu có thiết lập chặn), hoặc để lệnh `ON DELETE CASCADE` (Xóa dây chuyền) hoạt động.
  connection.pragma("foreign_keys = ON");

  // [KEYWORD: connection.pragma("journal_mode = WAL")]
  // TẠI SAO DÙNG: WAL (Write-Ahead Logging) là một cơ chế ghi log.
  // LÝ DO: Mặc định, SQLite sẽ "khóa" toàn bộ file khi đang ghi. Nếu có 10 người dùng cùng truy cập, họ sẽ phải xếp hàng chờ nhau. Bật WAL cho phép người đọc (Read) và người ghi (Write) hoạt động ĐỒNG THỜI mà không bị chặn.
  connection.pragma("journal_mode = WAL");

  // [KEYWORD: connection.exec()]
  // TẠI SAO DÙNG: Dùng để chạy các câu lệnh SQL không trả về kết quả (như CREATE TABLE). Nó có thể chạy nhiều lệnh cùng lúc.
  // CÁCH KHÁC: `connection.prepare()`. Nhưng prepare chỉ dùng cho các lệnh có tham số động (?), còn cấu trúc bảng tĩnh thì dùng `exec` nhanh hơn.
  connection.exec(`
    
    -- TẠO BẢNG USERS: Phân quyền Admin và User
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL, 
      -- [KEYWORD: PRIMARY KEY]: Cột này là duy nhất, không được trùng, dùng để định danh (ID).
      -- [KEYWORD: NOT NULL]: Bắt buộc phải có giá trị, không được để trống.
      
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE, 
      -- [KEYWORD: UNIQUE]: Không được có 2 user trùng email.
      
      role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
      -- [KEYWORD: DEFAULT 'USER']: Nếu khi thêm user mà không truyền role, mặc định sẽ là 'USER'.
      -- [KEYWORD: CHECK]: Ràng buộc dữ liệu. Chỉ cho phép nhập 'USER' hoặc 'ADMIN'. Nếu nhập 'SUPERADMIN', SQL sẽ chặn và báo lỗi ngay.
      
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      -- [KEYWORD: DEFAULT CURRENT_TIMESTAMP]: Tự động lấy giờ hiện tại của máy tính khi thêm bản ghi.
    );

    -- TẠO BẢNG BOOKS
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      isbn TEXT UNIQUE,
      published_year INTEGER CHECK (published_year IS NULL OR published_year BETWEEN 1000 AND 2100),
      thumbnail TEXT, -- Cho phép để trống (NULL) nếu sách không có ảnh.
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- TẠO BẢNG AUTHORS
    CREATE TABLE IF NOT EXISTS authors (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      bio TEXT
    );

    -- TẠO BẢNG CATEGORIES
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE
    );

    -- TẠO BẢNG LIÊN KẾT BOOK_AUTHORS: Giải quyết quan hệ N-N (1 sách nhiều tác giả, 1 tác giả nhiều sách)
    CREATE TABLE IF NOT EXISTS book_authors (
      book_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_order INTEGER NOT NULL DEFAULT 1,
      -- [KEYWORD: PRIMARY KEY (book_id, author_id)]: Đây là Khóa chính phức hợp. Cặp (Sách, Tác giả) phải là duy nhất. Không thể thêm 1 tác giả vào cùng 1 cuốn sách 2 lần.
      PRIMARY KEY (book_id, author_id),
      
      -- [KEYWORD: FOREIGN KEY ... REFERENCES ... ON DELETE CASCADE]
      -- Ý nghĩa: Khóa ngoại trỏ đến bảng books. Nếu ai đó xóa cuốn sách này khỏi bảng books, thì dòng liên kết này cũng tự động bị xóa theo (CASCADE).
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
    );

    -- TẠO BẢNG LIÊN KẾT BOOK_CATEGORIES
    CREATE TABLE IF NOT EXISTS book_categories (
      book_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      PRIMARY KEY (book_id, category_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    -- TẠO BẢNG USER_BOOKS: Quản lý trạng thái kệ sách
    CREATE TABLE IF NOT EXISTS user_books (
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      shelf TEXT NOT NULL DEFAULT 'want_to_read' CHECK (shelf IN ('want_to_read', 'reading', 'read', 'none')),
      notes TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, book_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    -- TẠO BẢNG REVIEWS
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

  // Trả về đối tượng connection để các file khác có thể dùng.
  return connection;
}

// ============================================================================
// PHẦN 4: XUẤT KẾT NỐI RA NGOÀI (GLOBAL CACHE)
// ============================================================================

// TypeScript cần biết kiểu dữ liệu của kết nối này là gì.
type DatabaseConnection = ReturnType<typeof openDatabase>;

// [KEYWORD: globalThis]
// TẠI SAO DÙNG: Đây là một biến toàn cục của môi trường Node.js.
// LÝ DO: Mỗi khi bạn sửa code và ấn Ctrl+S, Next.js sẽ "Hot Reload" (tải lại trang). Nếu mỗi lần tải lại, code lại chạy `new Database()`, bạn sẽ tạo ra hàng trăm kết nối rác, làm treo máy. 
// Giải pháp: Lưu kết nối vào `globalThis` để tái sử dụng lại.
const globalForDb = globalThis as unknown as {
  myReadsDb?: DatabaseConnection;
};

// [KEYWORD: ?? (Nullish Coalescing)]
// Ý nghĩa: Nếu `globalForDb.myReadsDb` có giá trị (không phải null/undefined), thì dùng nó. Ngược lại, thì gọi `openDatabase()` để tạo mới.
// CÁCH KHÁC: Dùng `||`. Nhược điểm: `||` sẽ coi các giá trị như `0`, `""`, `false` là sai và thực hiện vế sau, trong khi `??` chỉ quan tâm đến `null` hoặc `undefined`.
export const db = globalForDb.myReadsDb ?? openDatabase();

// Nếu đang ở môi trường phát triển (không phải production), lưu lại vào global.
if (process.env.NODE_ENV !== "production") {
  globalForDb.myReadsDb = db;
}