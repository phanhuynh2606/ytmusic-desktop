# 📐 Kế Hoạch Triển Khai: Mở Rộng Hẹn Giờ Ngủ (Sleep Timer Actions)

> **Mục tiêu:** Mở rộng tính năng Sleep Timer trong `ytmusic-desktop` để hỗ trợ đa dạng hành động khi hết giờ: **Tạm dừng nhạc (Pause)**, **Đóng app (Quit)**, **Khóa màn hình (Lock)**, **Ngủ máy tính (Sleep / Suspend)**, và **Tắt máy tính (Shutdown)**.

---

## 1. Tổng quan Kiến trúc

```mermaid
flowchart TD
    UI["Giao diện Modal /sleeptimer"] -->|tRPC: setTimer({ duration, mode })| Service["SleepTimerProvider (Main Process)"]
    Service -->|Đếm ngược hoàn tất / Hết bài| Trigger["triggerAction()"]
    Trigger -->|mode = 'pause'| PauseAction["trackService.pauseTrack()"]
    Trigger -->|mode = 'quit'| QuitAction["serverMain.emit('app.quit', null, true)"]
    Trigger -->|mode = 'lock'| LockAction["Thực thi lệnh LockWorkStation (OS)"]
    Trigger -->|mode = 'sleep'| SleepAction["Thực thi lệnh Sleep/Suspend (OS)"]
    Trigger -->|mode = 'shutdown'| ShutdownAction["Thực thi lệnh Shutdown (OS)"]
```

---

## 2. Chi tiết các file thay đổi

### 📁 Component 1: Main Process & tRPC Router
- **[MODIFY]** `apps/ytmdesktop2/src/main/trpc/routers/sleepTimer/service.ts`
  - Mở rộng kiểu dữ liệu `SleepTimerState.mode`:
    ```ts
    export type SleepTimerMode = "pause" | "quit" | "lock" | "sleep" | "shutdown";
    ```
  - Thêm helper thực thi lệnh hệ thống an toàn đa nền tảng:
    - **Windows**:
      - `lock`: `rundll32.exe user32.dll,LockWorkStation`
      - `sleep`: `rundll32.exe powrprof.dll,SetSuspendState 0,1,0`
      - `shutdown`: `shutdown /s /t 10 /c "YouTube Music: Hẹn giờ tắt máy tính"`
    - **macOS**:
      - `lock`: `/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession -suspend`
      - `sleep`: `pmset sleepnow`
      - `shutdown`: `osascript -e 'tell app "System Events" to shut down'`
    - **Linux**:
      - `lock`: `loginctl lock-session || xdg-screensaver lock`
      - `sleep`: `systemctl suspend`
      - `shutdown`: `systemctl poweroff`
  - Cập nhật kích thước cửa sổ modal từ `350x470` lên `350x520` để chứa các tùy chọn hành động thoải mái mà không bị cuộn.

- **[MODIFY]** `apps/ytmdesktop2/src/main/trpc/routers/sleepTimer/router.ts`
  - Cập nhật Zod validation schema:
    ```ts
    const sleepTimerModeEnum = z.enum(["pause", "quit", "lock", "sleep", "shutdown"]);
    ```
  - Cập nhật `setTimerInput` và endpoint `setMode`.

---

### 📁 Component 2: Giao diện Người Dùng (`/sleeptimer`)
- **[MODIFY]** `apps/ytmdesktop2/src/renderer/src/routes/sleeptimer.tsx`
  - Thêm icon từ `lucide-react`: `Lock`, `Moon`, `MonitorOff` hoặc `PowerOff`.
  - Cập nhật state `mode`: `SleepTimerMode`.
  - Thiết kế lại cụm lựa chọn **Hành động khi hết giờ** với 5 nút lựa chọn trực quan, có màu sắc trạng thái rõ ràng:
    1. **Tạm dừng nhạc** (`pause`) - Màu Hổ phách (Amber)
    2. **Đóng app** (`quit`) - Màu Cam (Orange)
    3. **Khóa màn hình** (`lock`) - Màu Xanh lam (Blue)
    4. **Ngủ máy** (`sleep`) - Màu Tím (Indigo/Purple)
    5. **Tắt máy** (`shutdown`) - Màu Đỏ (Red)
  - Thêm dòng chú thích an toàn khi chọn `shutdown`: *"Hệ thống sẽ đếm lùi 10 giây trước khi tắt máy để bạn kịp lưu công việc."*

---

## 3. Kế hoạch Kiểm thử & Xác minh

### Kiểm thử Tự động & TypeScript
- Chạy `typecheck:node` để kiểm tra Main process.
- Chạy `typecheck:web` để kiểm tra Renderer & route types.

### Kiểm thử Thủ công (Manual Verification)
1. Mở cửa sổ Sleep Timer (`/sleeptimer`).
2. Chọn từng chế độ hành động (`pause`, `quit`, `lock`, `sleep`, `shutdown`).
3. Đặt hẹn giờ thử nghiệm (ví dụ 1 phút hoặc Khi kết thúc bài hát) và kiểm tra:
   - Countdown hiển thị chuẩn xác.
   - Thẻ hành động hiển thị đúng nhãn tiếng Việt tương ứng.
   - Khi hết giờ: bài hát dừng phát và hành động tương ứng được kích hoạt.
