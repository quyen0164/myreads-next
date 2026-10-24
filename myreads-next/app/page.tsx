// ============================================================================
// FILE: app/page.tsx (Trang chủ - Đã tích hợp Tìm kiếm)
// ============================================================================
// [Ý NGHĨA CỦA FILE NÀY]:
// Đây là Server Component chính của trang chủ.
// Nó chịu trách nhiệm:
// 1. Đọc Cookie để biết ai đang đăng nhập.
// 2. Đọc từ khóa tìm kiếm (q) từ URL.
// 3. Gọi Database (qua hàm listBooksForUser) để lấy sách (có lọc nếu đang tìm kiếm).
// 4. Phân chia sách vào các kệ phù hợp và gửi xuống giao diện.
// ============================================================================

// [TỪ KHÓA: import listBooksForUser]
// - Ý NGHĨA: Hàm lấy danh sách sách từ Database (đã hỗ trợ tìm kiếm ở File 1).
import { listBooksForUser } from "@/lib/books";

// [TỪ KHÓA: import Link]
// - Ý NGHĨA: Component chuyển trang của Next.js (giúp chuyển trang không bị load lại).
import Link from "next/link";

// [TỪ KHÓA: import cookies]
// - Ý NGHĨA: Dùng để đọc Cookie trên Server (để kiểm tra xem user đã đăng nhập chưa).
import { cookies } from "next/headers";

// [TỪ KHÓA: import Suspense]
// - Ý NGHĨA: Component bao bọc, hiển thị fallback (đang tải) trong lúc chờ dữ liệu bất đồng bộ.
// - TẠI SAO DÙNG: Ở Next.js mới, các hàm như cookies() hay searchParams đều là bất đồng bộ.
//   Bọc trong Suspense giúp trang web không bị "đơ" khi đang chờ lấy dữ liệu.
import { Suspense } from "react";

// [TỪ KHÓA: import HomeClient và SearchBar]
// - HomeClient: Component hiển thị các kệ sách.
// - SearchBar: Component thanh tìm kiếm (chúng ta vừa làm ở File 2).
import HomeClient from "@/components/HomeClient";
//import SearchBar from "@/components/SearchBar"; 
import "./styles.css";

// [TỪ KHÓA: export default function Home({ searchParams })]
// - Ý NGHĨA: Đây là Component chính của trang.
// - [TỪ KHÓA: searchParams]
//   + Next.js tự động truyền các tham số trên URL vào biến này.
//   + VD: Nếu URL là /?q=Clean, thì searchParams sẽ là { q: "Clean" }.
//   + LƯU Ý NEXT.JS 15+: searchParams là một Promise, nên kiểu dữ liệu là Promise<{ q?: string }>.
export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <main className="main">
      <div className="container">
        {/* HEADER */}
        <header className="header">
          <h1>📚 MyReads</h1>
          <p>Thư viện sách cá nhân của bạn</p>
        </header>


        {/* NỘI DUNG CHÍNH (DANH SÁCH KỆ SÁCH) */}
        <Suspense fallback={<div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>Đang tải thư viện...</div>}>
          {/* Truyền searchParams tiếp xuống cho component con xử lý */}
          <HomeContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

// ============================================================================
// COMPONENT CON: HomeContent (Xử lý dữ liệu và render)
// ============================================================================
async function HomeContent({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  // 1. ĐỌC DỮ LIỆU TỪ COOKIE VÀ URL
  // [TỪ KHÓA: await cookies()]
  // - Đọc cookie để lấy thông tin đăng nhập.
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");
  
  // [TỪ KHÓA: await searchParams]
  // - Đợi Promise searchParams trả về object thực sự.
  const resolvedParams = await searchParams;
  
  // - Lấy từ khóa 'q' (nếu không có thì gán bằng chuỗi rỗng "").
  const searchQuery = resolvedParams.q || "";

  let userId = "guest"; 
  let isLoggedIn = false;

  // - Nếu có cookie, giải mã JSON để lấy userId.
  if (sessionCookie) {
    try {
      const sessionData = JSON.parse(sessionCookie.value);
      userId = sessionData.id;
      isLoggedIn = true;
    } catch (e) {} // Nếu cookie hỏng thì bỏ qua, coi như chưa đăng nhập.
  }

  // 2. GỌI DATABASE
  // - Gọi hàm từ File 1. Truyền userId và từ khóa tìm kiếm (nếu có).
  const books = listBooksForUser(userId, searchQuery);

  // 3. PHÂN CHIA KỆ SÁCH (LOGIC)
  // - Lọc ra các sách đang đọc, muốn đọc, và đã đọc.
  const currentlyReading = books.filter((b) => b.shelf === "reading");
  // - Nếu sách chưa được xếp kệ (null) VÀ đã đăng nhập, mặc định cho vào kệ "Want to read".
  const wantToRead = books.filter((b) => b.shelf === "want_to_read" || (!b.shelf && isLoggedIn));
  const read = books.filter((b) => b.shelf === "read");

  // [MỚI]: CHUẨN BỊ DỮ LIỆU KỆ HIỂN THỊ
  // - Nếu đang TÌM KIẾM (có searchQuery) HOẶC CHƯA ĐĂNG NHẬP: 
  //   Chỉ hiển thị 1 kệ duy nhất chứa toàn bộ kết quả (cho dễ nhìn).
  // - Nếu KHÔNG tìm kiếm và ĐÃ ĐĂNG NHẬP: 
  //   Hiển thị 3 kệ riêng biệt (Currently Reading, Want to Read, Read).
  const shelvesData = (!isLoggedIn || searchQuery)
    ? [{ 
        title: searchQuery ? `🔍 Kết quả cho: "${searchQuery}"` : "📚 Tất cả sách trong thư viện", 
        books: books 
      }]
    : [
        { title: "📖 Currently Reading", books: currentlyReading },
        { title: "⏳ Want to Read", books: wantToRead },
        { title: "✅ Read", books: read }
      ];

  return (
    <>
      {/* NÚT ĐĂNG NHẬP (Chỉ hiện khi chưa đăng nhập và không phải đang tìm kiếm) */}
      {!isLoggedIn && !searchQuery && (
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <Link href="/login" style={{ color: "white", background: "#2563eb", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontWeight: "bold" }}>
            Đăng nhập ngay để quản lý sách
          </Link>
        </div>
      )}

      {/* THÔNG BÁO KHÔNG TÌM THẤY SÁCH */}
      {/* - Nếu đang tìm kiếm mà mảng books rỗng (length === 0) thì hiện thông báo. */}
      {searchQuery && books.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
          Không tìm thấy cuốn sách nào khớp với từ khóa "{searchQuery}".
        </div>
      )}

      {/* RENDER GIAO DIỆN KỆ SÁCH */}
      {/* - Truyền mảng shelvesData (đã được tính toán ở trên) xuống cho Client Component hiển thị. */}
      <HomeClient shelvesData={shelvesData} isLoggedIn={isLoggedIn} />
    </>
  );
}