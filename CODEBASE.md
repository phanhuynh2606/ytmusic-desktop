# Kiến Trúc Codebase & Hướng Dẫn Kỹ Thuật (CODEBASE.md)

Tài liệu này mô tả chi tiết toàn bộ cấu trúc mã nguồn, luồng hoạt động và hướng dẫn phát triển cho dự án **YouTube Music Desktop (ytmdesktop2)**.

---

## 1. Tổng quan Công nghệ (Tech Stack)

Dự án được xây dựng dưới dạng **Monorepo** quản lý bằng **pnpm workspaces**:

| Thành phần | Công nghệ sử dụng | Mục đích |
| :--- | :--- | :--- |
| **Runtime & Shell** | Electron (bản mới dùng `WebContentsView`) | Ứng dụng desktop đa nền tảng (Windows/macOS/Linux) |
| **Ngôn ngữ** | TypeScript (Strict mode) | Định kiểu toàn diện từ Main đến Renderer |
| **Giao diện (Frontend)** | React 18/19 + Vite (`electron-vite`) | Giao diện thanh Toolbar, Cài đặt, Mini-player |
| **Router Frontend** | `@tanstack/react-router` | Điều hướng các view trong ứng dụng React |
| **Styling** | Tailwind CSS + Base UI (`@base-ui/react`) | Giao diện hiện đại, hỗ trợ theme |
| **Giao tiếp IPC** | **tRPC** (`@trpc/server`, `@trpc/client`) | Gọi API từ UI xuống hệ thống an toàn kiểu type-safe |
| **Linter / Formatter**| Biome (`@biomejs/biome`) | Định dạng và kiểm tra code tốc độ cao |
| **Đóng gói cài đặt** | `electron-builder` | Xuất file cài đặt `.exe`, `.dmg`, `.AppImage` |

---

## 2. Bản đồ Cấu trúc Thư mục (Directory Structure)

```text
YTB/
├── apps/
│   ├── ytmdesktop2/             # [TRỌNG TÂM] Ứng dụng Desktop chính
│   │   ├── src/
│   │   │   ├── main/            # Electron Main Process (Logic hệ thống, OS, tRPC, Services)
│   │   │   ├── preload/         # Preload scripts (cầu nối bảo mật giữa Main và Web)
│   │   │   ├── renderer/        # React UI (Toolbar, Settings, Tray mini-player)
│   │   │   ├── renderer-plugins/# Scripts tiêm (inject) trực tiếp vào trang web YouTube Music
│   │   │   ├── shared/          # Types, interfaces, helper functions dùng chung
│   │   │   └── translations/    # Đa ngôn ngữ (i18n)
│   │   ├── electron-builder.yml # Cấu hình đóng gói xuất file cài đặt (.exe)
│   │   ├── electron.vite.config.ts # Cấu hình Vite build cho 3 môi trường: main, preload, renderer
│   │   └── package.json         # Danh sách thư viện và scripts của desktop app
│   └── docs/                    # Trang web tài liệu hướng dẫn (Next.js/Fumadocs)
├── packages/
│   ├── streamdeck/              # Plugin mở rộng cho phần cứng Elgato Stream Deck
│   └── userscript/              # Bản script chạy độc lập trên trình duyệt web (Tampermonkey)
├── pnpm-workspace.yaml          # Khai báo không gian làm việc Monorepo
└── package.json                 # Cấu hình gốc quản lý toàn bộ workspace
```

---

## 3. Cơ chế hoạt động cốt lõi (Core Architecture)

### 3.1. Mô hình Hiển thị Cửa sổ (Window & Views)
* **File chính:** `apps/ytmdesktop2/src/main/windows/windowManager.ts`
* Ứng dụng sử dụng kiến trúc **WebContentsView** mới nhất của Electron để chia màn hình thành 2 lớp:
  1. **`toolbarView`**: Nạp giao diện React cục bộ (`src/renderer/src/routes/youtube`). Đây là thanh tiêu đề tùy chỉnh (Custom Titlebar) chứa logo, nút Back/Forward, nút Mở Settings, các nút điều khiển thu nhỏ/phóng to/đóng.
  2. **`youtubeView`**: Nạp trực tiếp trang web `https://music.youtube.com/`. Người dùng thao tác nghe nhạc trực tiếp trên view này, bảo đảm luôn tương thích 100% với giao diện mới nhất của YouTube Music.

### 3.2. Can thiệp trang web ngầm (`renderer-plugins/youtube`)
Khi trang `music.youtube.com` tải xong, app sẽ tự động tiêm (inject) các script để trích xuất dữ liệu và điều khiển:
* **`track-player.plugin.ts`**: Lắng nghe thẻ `<video>` và cây DOM để bắt sự kiện: Tên bài hát, ca sĩ, album, ảnh bìa, thời lượng, thời gian hiện tại, trạng thái phát (play/pause/repeat/shuffle).
* **`track-like.plugin.ts`**: Bắt trạng thái Like / Dislike của bài hát và gửi lệnh click Thích khi người dùng bấm phím tắt.
* **`lyrics.plugin.ts`**: Lấy lời bài hát đồng bộ từ các nguồn (Better Lyrics, LRCLIB, Unison).
* **`track-theme.plugin.ts`**: Đổi màu giao diện theo tông màu chủ đạo của ảnh bìa album đang phát.
* **`cpu-tamer` & `perf-fixes`**: Tối ưu DOM, ngắt các timer ngầm không cần thiết để app chạy êm ái, không bị ngốn CPU/RAM khi nghe nhạc nhiều giờ liền.

### 3.3. Bộ não Main Process & Các Router tRPC (`src/main/trpc/routers`)
Toàn bộ logic tương tác với hệ điều hành và các dịch vụ bên ngoài được chia thành các router độc lập:
* **`discord`**: Discord Rich Presence — kết nối IPC với Discord để hiển thị bài hát đang nghe trên Profile cá nhân.
* **`mediaControl` / `shortcut`**: Bắt các phím đa phương tiện vật lý trên bàn phím (Play, Pause, Next, Prev) và phím tắt toàn cục (Global Hotkeys).
* **`lastfm`**: Scrobble bài hát lên tài khoản Last.fm.
* **`api`**: Khởi chạy Local REST & WebSocket API Server (mặc định cổng `13091`) cho phép Stream Deck, Companion, OBS hoặc ứng dụng di động điều khiển nhạc từ xa.
* **`tray` & `trayView`**: Biểu tượng ở khay Taskbar Windows; hỗ trợ mở popup Mini Player xem nhanh bài hát khi bấm vào icon.
* **`chromecast`**: Tìm kiếm thiết bị và truyền âm thanh qua Google Cast / Chromecast trong mạng nội bộ.
* **`settings`**: Lưu trữ và quản lý cấu hình người dùng (được mã hóa an toàn).

---

## 4. Hướng dẫn Tuỳ biến Code (Customization Guide)

### 4.1. Thay đổi Nhận diện Thương hiệu (Branding)
1. **Tên ứng dụng & Metadata:**
   * Sửa trong `apps/ytmdesktop2/package.json`:
     * `"name"`: Tên package
     * `"desktopName"`: Tên app hiển thị trên Windows
     * `"description"`: Mô tả
     * `"author"`: Tên tác giả của bạn
2. **Icon ứng dụng & Logo:**
   * Thay icon trong `apps/ytmdesktop2/resources/` (icon `.ico` cho Windows, `.icns` cho macOS, `.png` cho Linux).
   * Thay logo trên thanh Toolbar tại: `apps/ytmdesktop2/src/renderer/src/assets/`.

### 4.2. Chỉnh sửa Giao diện Toolbar & Cài đặt
* **Thanh điều khiển phía trên (Toolbar):**
  * Thư mục: `apps/ytmdesktop2/src/renderer/src/routes/youtube/`
  * Có thể thêm nút tắt, chỉnh sửa thanh tìm kiếm, thay đổi layout.
* **Hộp thoại Cài đặt (Settings):**
  * Thư mục: `apps/ytmdesktop2/src/renderer/src/routes/_settings/`
  * Dễ dàng thêm tab cấu hình mới hoặc ẩn các dịch vụ không dùng đến.

### 4.3. Thêm tính năng mới vào Main Process
1. Tạo một router mới trong `apps/ytmdesktop2/src/main/trpc/routers/<ten_tinh_nang>/`.
2. Định nghĩa các procedure `query` hoặc `mutation`.
3. Đăng ký router vào `rootRouter` trong `apps/ytmdesktop2/src/main/trpc/router.ts`.
4. Ở phía React UI, gọi thẳng qua hook `trpc.<ten_tinh_nang>.<ham>.useMutation()`.

---

## 5. Các Lệnh Chạy Dự Án (CLI Commands)

Chạy từ thư mục gốc (`d:\Projects\Tools\YTB`):

```bash
# 1. Cài đặt toàn bộ dependencies (chạy 1 lần ban đầu)
pnpm install

# 2. Chạy môi trường phát triển (Hot-reload cả Main và Renderer)
pnpm run dev

# 3. Kiểm tra lỗi kiểu dữ liệu TypeScript
pnpm run typecheck

# 4. Kiểm tra và format code bằng Biome
pnpm run biome:check:apply

# 5. Đóng gói ứng dụng ra file cài đặt Windows (.exe installer)
pnpm run build:win
# hoặc lệnh đóng gói đầy đủ:
pnpm run release:pack:win
```

*File sau khi đóng gói sẽ nằm trong thư mục `apps/ytmdesktop2/dist/`.*
