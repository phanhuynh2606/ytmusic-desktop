# ⌨️ Kế Hoạch Triển Khai: Phím Tắt Toàn Cục Tùy Chỉnh (Custom Global Hotkeys)

> **Mục tiêu:** Cho phép người dùng tự do gán và tùy chỉnh các tổ hợp phím tắt trên toàn hệ thống (Global Shortcuts) để điều khiển ứng dụng mọi lúc mọi nơi ngay cả khi đang chơi game, gõ văn bản hoặc dùng app khác.

---

## 1. Danh sách Hành động hỗ trợ gán phím tắt

| Hành động | Phím mặc định | Mô tả |
| :--- | :--- | :--- |
| **Phát / Tạm dừng** | `Shift+Alt+Space` | Chuyển đổi trạng thái phát nhạc |
| **Bài kế tiếp** | `Shift+Alt+Right` | Chuyển sang bài tiếp theo |
| **Bài trước đó** | `Shift+Alt+Left` | Quay lại bài trước |
| **Tăng âm lượng** | `Shift+Alt+Up` | Tăng âm lượng 5% |
| **Giảm âm lượng** | `Shift+Alt+Down` | Giảm âm lượng 5% |
| **Bật/Tắt tiếng (Mute)** | `Shift+Alt+M` | Tắt hoặc mở lại âm thanh |
| **Thả tim (Like/Unlike)** | `Shift+Alt+L` | Thích bài hát hiện tại vào thư viện |
| **Bật/Tắt Lời bài hát nổi** | `Shift+Alt+K` | Ẩn hoặc hiện thanh Floating Lyrics |

---

## 2. Chi tiết các file và thành phần

### 📁 Component 1: Cấu hình Settings
- **[MODIFY]** `apps/ytmdesktop2/src/main/trpc/routers/settings/service.ts`:
  - Thêm cấu trúc lưu trữ phím tắt vào `defaultSettings`:
    ```ts
    shortcuts: {
      enabled: true,
      bindings: {
        playPause: "Shift+Alt+Space",
        next: "Shift+Alt+Right",
        prev: "Shift+Alt+Left",
        volumeUp: "Shift+Alt+Up",
        volumeDown: "Shift+Alt+Down",
        mute: "Shift+Alt+M",
        like: "Shift+Alt+L",
        toggleFloatingLyrics: "Shift+Alt+K",
      }
    }
    ```

---

### 📁 Component 2: Main Process & Router
- **[MODIFY]** `apps/ytmdesktop2/src/main/trpc/routers/shortcut/service.ts`:
  - Viết lại hàm đăng ký phím tắt để hỗ trợ nạp động từ Settings:
    - Khi khởi động: Đăng ký toàn bộ phím tắt đang lưu.
    - Lắng nghe sự kiện `onSettingChange("shortcuts", ...)`: Tự động unregister phím cũ và register phím mới ngay lập tức.
    - Xử lý các action tương ứng:
      - `volumeUp`: Tăng `volume` thêm 0.05 qua `trackService.setVolume`.
      - `volumeDown`: Giảm `volume` 0.05 qua `trackService.setVolume`.
      - `mute`: Đảo ngược trạng thái mute.
      - `like`: Toggle like qua `trackService.likeTrack`.
      - `toggleFloatingLyrics`: Gọi `floatingLyricsService.toggle()`.

- **[MODIFY]** `apps/ytmdesktop2/src/main/trpc/routers/shortcut/router.ts`:
  - Thêm endpoint `resetDefaults`, `getBindings`, `updateBinding`.

---

### 📁 Component 3: Giao diện Cài Đặt (`/_settings/shortcuts`)
- **[NEW]** `apps/ytmdesktop2/src/renderer/src/routes/_settings/shortcuts.tsx`:
  - Thêm mục menu "Phím tắt (Shortcuts)" trên sidebar cài đặt (`_settings/route.tsx`).
  - **Component Key Recorder**:
    - Khi người dùng click vào ô phím tắt, ô sẽ chuyển sang trạng thái *"Nhấn tổ hợp phím mong muốn..."*.
    - Bắt sự kiện `onKeyDown` (Ctrl, Alt, Shift, Meta + Phím ký tự/mũi tên).
    - Tự động chuẩn hóa định dạng phím chuẩn Electron (ví dụ: `Ctrl+Shift+P`).
    - Kiểm tra và hiển thị cảnh báo nếu tổ hợp phím bị trùng với hành động khác.
  - Nút **"Khôi phục mặc định (Reset to Defaults)"**.

---

## 3. Kế hoạch Kiểm thử & Xác minh

### Kiểm thử Tự động
- Chạy `tsc` để đảm bảo kiểu dữ liệu giữa Main và Renderer đồng bộ.

### Kiểm thử Thủ công
1. Mở Cài đặt ➔ Phím tắt.
2. Gán thử phím tắt mới (ví dụ `Ctrl+Alt+P` cho Play/Pause).
3. Thu nhỏ ứng dụng, mở trình duyệt hoặc ứng dụng khác, nhấn `Ctrl+Alt+P` để kiểm tra nhạc có tạm dừng/phát ngay lập tức không.
4. Thử phím tăng/giảm âm lượng và phím thả tim.
5. Bấm nút "Khôi phục mặc định" và kiểm tra phím trở về ban đầu.
