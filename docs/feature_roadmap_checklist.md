# 📋 Kế Hoạch & Checklist Triển Khai Tính Năng (YTM Desktop)

> [!NOTE]
> Bảng checklist này theo dõi tiến độ triển khai tuần tự 4 tính năng nâng cấp trải nghiệm người dùng cho ứng dụng **Music Desktop App**.

---

## ⏳ Giai Đoạn 1: Mở Rộng Hẹn Giờ Ngủ (Sleep Timer Actions)
*Cho phép hẹn giờ tắt máy tính, đưa máy về trạng thái ngủ hoặc khóa màn hình khi hết nhạc.*

- [x] **1.1. Mở rộng State & Router trong Main Process**:
  - Mở rộng enum `SleepTimerState.mode`: `"pause"` | `"quit"` | `"sleep"` | `"shutdown"` | `"lock"`.
  - Triển khai hàm thực thi lệnh OS:
    - **Windows**:
      - `sleep`: `rundll32.exe powrprof.dll,SetSuspendState 0,1,0`
      - `shutdown`: `shutdown /s /t 10 /c "YouTube Music: Hẹn giờ tắt máy tính"` (có 10 giây dự phòng)
      - `lock`: `rundll32.exe user32.dll,LockWorkStation`
    - Hỗ trợ fallback an toàn cho macOS và Linux.
- [x] **1.2. Cập nhật Giao diện Modal `/sleeptimer`**:
  - Thêm cụm 5 lựa chọn hành động khi hết giờ (`Dừng nhạc`, `Đóng app`, `Khóa máy`, `Ngủ máy`, `Tắt máy`).
  - Giao diện dạng 5 nút tinh gọn với icon và màu nhận diện nổi bật, hiển thị cảnh báo 10s khi chọn tắt máy.
- [x] **1.3. Kiểm thử & Xác nhận**:
  - Typecheck hoàn tất cho cả Node main process và Web renderer.

---

## 🎤 Giai Đoạn 2: Lời Bài Hát Nổi Màn Hình (Desktop Floating Lyrics)
*Thanh lời bài hát Karaoke trong suốt ghim trên cùng (`Always-on-Top`), hỗ trợ xuyên thấu chuột (`Click-through`) khi chơi game, lướt web hoặc làm việc.*

- [x] **2.1. Khởi tạo Floating Lyrics Window & Provider**:
  - Tạo `FloatingLyricsProvider` trong Electron Main (`src/main/trpc/routers/floatingLyrics/service.ts`):
    - Cửa sổ frameless, trong suốt (`transparent: true`), `alwaysOnTop: true`, `skipTaskbar: true`, `screen-saver` level.
    - Ghi nhớ tọa độ vị trí và kích thước (`persistBounds`) trên màn hình.
- [x] **2.2. Hỗ trợ Cơ Chế Xuyên Thấu Chuột (Click-through / Lock)**:
  - Khi khóa: kích hoạt `win.setIgnoreMouseEvents(true, { forward: true })` để chuột click xuyên qua như không có cửa sổ.
  - Hỗ trợ mở khóa trực tiếp qua Tray menu hoặc rê chuột vào nút mở khóa thông minh.
- [x] **2.3. Tạo Giao diện Route `/floatinglyrics`**:
  - Giao diện 2 dòng lời bài hát Karaoke đồng bộ theo mili-giây từ LRCLIB.
  - Cụm điều khiển mini: Drag handle kéo thả vị trí, Play/Pause/Prev/Next, đổi căn lề (Trái/Giữa), nút Khóa xuyên thấu, nút Đóng.
- [x] **2.4. Tích hợp Tray Menu & Cấu hình Settings**:
  - Thêm cụm menu con `Lời bài hát nổi (Floating Lyrics)` với các tùy chọn Bật/Tắt và Khóa xuyên chuột trực tiếp từ System Tray.
  - Cấu hình settings `floatingLyrics` lưu trữ font size, màu sắc chữ, độ mờ nền và vị trí cửa sổ.

---

## ⌨️ Giai Đoạn 3: Cài Đặt Phím Tắt Toàn Cục Tùy Chỉnh (Custom Global Hotkeys)
*Điều khiển nhạc từ bất cứ đâu trên Windows mà không cần mở cửa sổ ứng dụng.*

- [x] **3.1. Cập nhật Cấu hình Settings & Schema**:
  - Định nghĩa key mapping cho các hành động: `playPause`, `next`, `prev`, `volumeUp`, `volumeDown`, `mute`, `like`, `toggleFloatingLyrics`.
- [x] **3.2. Nâng cấp `ShortcutService` Trong Main**:
  - Lắng nghe thay đổi settings theo thời gian thực để hủy và đăng ký lại `globalShortcut` ngay lập tức mà không cần khởi động lại app.
  - Tích hợp điều khiển TrackService: toggle playback, next/prev track, volume up/down (+/-5%), mute/unmute và like track.
- [x] **3.3. Tạo Giao diện Cài Đặt Phím Tắt (`/_settings/shortcuts`)**:
  - Thẻ ghi phím tương tác (*Key Recorder Input*): người dùng chỉ cần bấm tổ hợp phím mong muốn để ghi nhận.
  - Phím tắt hiển thị dưới dạng phím bấm (*Keycap Badges*).
  - Nút khôi phục phím tắt mặc định (*Reset to Defaults*).

---

## 🎚️ Giai Đoạn 4: Nâng Cấp Equalizer & Presets Âm Thanh Đỉnh Cao
*Bộ cân chỉnh âm thanh đa dạng và giao diện đồ họa sống động hơn.*

- [x] **4.1. Bổ sung các Preset EQ chuyên sâu**:
  - Thêm các profile âm thanh cao cấp vào `@shared/equalizer/constants.ts`:
    - `lofi`: Âm hưởng ấm áp, giảm bớt dải treble gắt, mô phỏng tiếng máy đĩa cổ điển.
    - `jazz`: Nổi bật tiếng kèn saxophone và bassline dẻo dai.
    - `treble-boost`: Làm sáng giọng hát và chi tiết nhạc cụ dây.
    - `cinema`: Tăng chiều sâu không gian xem MV ca nhạc.
    - `vocal-clarity`: Lọc trong trẻo giọng nói / podcast.
    - `dance` & `rnb`: Tăng cường lực đánh âm trầm sâu lắng.
- [x] **4.2. Trực quan hóa Giao diện EQ**:
  - Biểu đồ đường cong đáp tuyến tần số (Frequency Response Curve) SVG uốn lượn thời gian thực với gradient area fill.
  - Phân loại Preset theo các thẻ chuyên mục: *Tất cả*, *Phổ biến*, *Thể loại*, *Hiệu ứng đặc biệt*.

---

### Tiến độ tổng thể:
- [x] **Chuẩn bị**: Lập checklist và kiến trúc triển khai
- [x] **Giai đoạn 1**: Mở rộng Hẹn giờ ngủ (Sleep Timer)
- [x] **Giai đoạn 2**: Lời bài hát nổi màn hình (Desktop Floating Lyrics)
- [x] **Giai đoạn 3**: Phím tắt toàn cục tùy chỉnh (Global Hotkeys)
- [x] **Giai đoạn 4**: Nâng cấp Equalizer & Presets
