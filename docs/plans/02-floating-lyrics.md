# 🎤 Kế Hoạch Triển Khai: Lời Bài Hát Nổi Trên Màn Hình (Desktop Floating Lyrics)

> **Mục tiêu:** Xây dựng cửa sổ thanh lời bài hát Karaoke độc lập, trong suốt, ghim nổi trên mọi ứng dụng (`Always-on-Top`), tự động cuộn chữ theo bài hát đang phát và hỗ trợ chế độ xuyên thấu chuột (`Click-through`) để không cản trở thao tác làm việc hoặc chơi game.

---

## 1. Tổng quan Kiến trúc

```mermaid
flowchart TD
    User["Người dùng"] -->|Bật Floating Lyrics| TrayMenu["Tray Menu / Settings"]
    TrayMenu -->|tRPC: toggle()| Service["FloatingLyricsProvider (Main Process)"]
    Service -->|Tạo cửa sổ trong suốt| Window["BrowserWindow (transparent, frameless, alwaysOnTop)"]
    Window -->|Tải route| UI["Route /floatinglyrics (Renderer)"]
    TrackSub["Track & Lyrics State"] -->|trpc.track.onTrackStateChange| UI
    UI -->|Render 2 dòng Karaoke phát sáng| Display["Dòng hiện tại + Dòng tiếp theo"]
    User -->|Bấm Khóa vị trí| Lock["win.setIgnoreMouseEvents(true, { forward: true })"]
    Lock -->|Click chuột xuyên thấu| BackgroundApps["Ứng dụng / Game bên dưới"]
```

---

## 2. Chi tiết các file và thành phần

### 📁 Component 1: Main Process & Window Management
- **[NEW]** `apps/ytmdesktop2/src/main/trpc/routers/floatingLyrics/service.ts`:
  - Khởi tạo `FloatingLyricsProvider` kế thừa `BaseProvider`:
    - Quản lý vòng đời `BrowserWindow` với các thuộc tính:
      ```ts
      const win = new BrowserWindow({
        width: 720,
        height: 130,
        minWidth: 400,
        minHeight: 90,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        resizable: true,
        webPreferences: {
          preload: join(__dirname, "../preload/api.js"),
        }
      });
      ```
    - Lưu vị trí và kích thước cửa sổ vào Settings (`floatingLyrics.x`, `floatingLyrics.y`, `floatingLyrics.width`, `floatingLyrics.height`).
    - Phương thức khóa / mở khóa xuyên chuột:
      ```ts
      setLocked(locked: boolean) {
        this.locked = locked;
        this.settings.set("floatingLyrics.locked", locked);
        win.setIgnoreMouseEvents(locked, { forward: true });
        this.broadcastState();
      }
      ```
    - Phương thức toggle ẩn/hiện (`show()`, `hide()`, `toggle()`).

- **[NEW]** `apps/ytmdesktop2/src/main/trpc/routers/floatingLyrics/router.ts`:
  - Khai báo các router procedure: `state`, `toggle`, `setLocked`, `setVisible`, `onStateChange`.

- **[MODIFY]** `apps/ytmdesktop2/src/main/trpc/router.ts`:
  - Đăng ký `floatingLyrics: floatingLyricsRouter`.

- **[MODIFY]** `apps/ytmdesktop2/src/main/domain/trayMenu.ts`:
  - Thêm mục menu chuột phải Tray: `[ ] Hiển thị lời bài hát nổi (Floating Lyrics)`.

---

### 📁 Component 2: Settings Schema & Storage
- **[MODIFY]** `apps/ytmdesktop2/src/main/trpc/routers/settings/service.ts`:
  - Bổ sung cấu hình `floatingLyrics`:
    ```ts
    floatingLyrics: {
      enabled: false,
      locked: false,
      fontSize: 22,
      textColor: "accent", // "accent" | "gold" | "cyan" | "white"
      backgroundOpacity: 25, // 0 - 80%
      align: "center", // "left" | "center"
    }
    ```

---

### 📁 Component 3: Giao diện Renderer (`/floatinglyrics`)
- **[NEW]** `apps/ytmdesktop2/src/renderer/src/routes/floatinglyrics.tsx`:
  - Lắng nghe realtime `useTrack()`, `useTrackState()` và nạp lời bài hát đồng bộ từ LRCLIB.
  - Hiển thị 2 dòng lời bài hát chuẩn Karaoke:
    - **Dòng hiện tại**: Font chữ lớn (20-26px), đậm, phát sáng nhẹ theo màu sắc accent của bìa đĩa (hoặc màu người dùng chọn), có hiệu ứng nhảy chữ mượt mà.
    - **Dòng kế tiếp**: Font chữ nhỏ hơn (14-16px), mờ nhẹ để người dùng dễ theo dõi trước lời tiếp theo.
  - Thanh công cụ điều khiển Mini (tự động hiện khi rê chuột nếu chưa khóa):
    - Tay cầm kéo thả vị trí (Drag handle).
    - Nút Khóa vị trí (Lock - kích hoạt click-through).
    - Cụm điều khiển mini: Prev, Play/Pause, Next.
    - Nút Mở cài đặt & Nút Ẩn.

---

## 3. Kế hoạch Kiểm thử & Xác minh

### Kiểm thử Tự động
- `typecheck:node` và `typecheck:web` đảm bảo tương thích kiểu dữ liệu 100%.

### Kiểm thử Thủ công
1. Bật Floating Lyrics từ Tray Menu hoặc Cài đặt.
2. Kiểm tra cửa sổ nổi trong suốt trên màn hình nền Windows.
3. Bật một bài hát bất kỳ: lời bài hát đồng bộ mượt mà theo từng giây.
4. Bấm nút Khóa (Lock): thử click chuột vào các icon màn hình phía dưới thanh lời bài hát xem chuột có xuyên qua mượt mà không (`click-through`).
5. Dùng phím tắt hoặc Tray menu để mở khóa và di chuyển thanh lời bài hát đến vị trí mong muốn.
