# 🎚️ Kế Hoạch Triển Khai: Nâng Cấp Equalizer & Presets Âm Thanh Chuyên Sâu

> **Mục tiêu:** Mở rộng bộ preset âm thanh chuyên nghiệp trong Equalizer (bổ sung Lo-Fi, Jazz & Blues, Treble Booster, Cinema Surround, Vocal Clarity), trực quan hóa đường cong tần số âm thanh (Frequency Curve Graph), và thêm lối tắt chuyển đổi nhanh EQ trên thanh điều khiển.

---

## 1. Danh sách Preset bổ sung

| Preset Key | Tên hiển thị | Đặc tính âm thanh | Dải tần nổi bật |
| :--- | :--- | :--- | :--- |
| `lofi` | **Lo-Fi / Vintage Vinyl** | Âm sắc mộc ấm, cắt nhẹ treble gắt, nhấn nhẹ dải trung âm và bass mềm | Tăng 125Hz-500Hz, giảm 8kHz-16kHz |
| `jazz` | **Jazz & Blues** | Tiếng bass đàn contrabass nảy, kèn saxophone ấm áp, chi tiết đĩa cymbal | Tăng 64Hz, 1kHz, 8kHz |
| `treble-boost` | **Treble Booster** | Làm sáng rõ từng chi tiết tiếng đàn, tiếng bộ gõ và giọng nữ cao | Tăng mạnh 4kHz-16kHz |
| `cinema` | **Cinema & MV Surround** | Tăng chiều sâu không gian xem MV, hiệu ứng âm vòm sống động | Tăng 32Hz, 64Hz và 8kHz |
| `vocal-clarity` | **Vocal Clarity (Lọc giọng)** | Làm nổi bật lời thoại/giọng hát, giảm tiếng ồn nền trầm | Cắt 32Hz-64Hz, nâng 1kHz-4kHz |

---

## 2. Chi tiết các file và thành phần

### 📁 Component 1: Presets & Constants
- **[MODIFY]** `apps/ytmdesktop2/src/shared/equalizer/constants.ts`:
  - Thêm các preset mới vào bảng `EQUALIZER_PRESETS`:
    - `lofi`: `gains: [2, 3, 3, 2, 1, 0, -1, -2, -3, -4], bassBoost: 20`
    - `jazz`: `gains: [3, 4, 2, 1, 2, 2, 1, 2, 3, 2], bassBoost: 30`
    - `treble-boost`: `gains: [-2, -2, -1, 0, 1, 2, 4, 6, 7, 8], bassBoost: 0`
    - `cinema`: `gains: [6, 5, 2, 0, -1, 0, 2, 4, 5, 6], bassBoost: 50`
    - `vocal-clarity`: `gains: [-4, -3, -1, 1, 3, 5, 4, 2, 0, -1], bassBoost: 0`

---

### 📁 Component 2: Trực quan hóa Biểu đồ Tần số (Frequency Curve)
- **[MODIFY]** `apps/ytmdesktop2/src/renderer/src/routes/_settings/player/equalizer.tsx`:
  - Thêm component `EqFrequencyCurve`:
    - Vẽ đường cong spline/bezier SVG mượt mà nối qua 10 điểm nút tương ứng 10 dải tần (từ 32Hz đến 16kHz).
    - Hiệu ứng gradient màu dưới đường cong (Area fill) thay đổi độ cao trực tiếp khi người dùng kéo thanh trượt gain.
  - Phân loại Preset thành các nhóm theo thẻ tiện lợi: *Phổ biến (Pop, Rock, Bass Boost)*, *Thư giãn (Lo-Fi, Acoustic, Classical)*, *Chuyên dụng (Vocal, Cinema, Jazz)*.

---

### 📁 Component 3: Lối Tắt EQ Nhanh trên Toolbar / Player
- **[MODIFY]** `apps/ytmdesktop2/src/renderer/src/routes/youtube/toolbar.tsx`:
  - Bổ sung nút bấm icon Equalizer nhỏ gọn trên thanh công cụ:
    - Bấm vào mở popover menu nhỏ cho phép: Bật/Tắt nhanh EQ, chọn nhanh Preset mong muốn mà không cần chuyển màn hình vào Settings.

---

## 3. Kế hoạch Kiểm thử & Xác minh

### Kiểm thử Tự động
- Chạy `tsc` để kiểm tra tính toàn vẹn type của các preset mới.

### Kiểm thử Thủ công
1. Vào Cài đặt ➔ Equalizer.
2. Bật Equalizer và thử chọn từng preset mới (`lofi`, `jazz`, `treble-boost`, `cinema`, `vocal-clarity`):
   - Nghe thử âm thanh thay đổi rõ rệt theo đặc tính từng preset.
   - Biểu đồ đường cong SVG uốn lượn mượt mà theo đúng 10 thanh trượt.
3. Thử chỉnh thủ công một thanh trượt gain: Preset tự động nhảy sang "Custom" và biểu đồ cập nhật ngay tức thì.
