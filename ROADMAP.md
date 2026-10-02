# 📋 Lộ Trình & Danh Sách Tính Năng (ROADMAP & TODO)

File này lưu trữ danh sách tính năng theo dõi tiến độ phát triển cho **Music Desktop App**. Khi hoàn thành mỗi tính năng, đánh dấu `[x]` để theo dõi.

---

## ✅ Giai đoạn 0: Khởi tạo dự án & Nhận diện thương hiệu (Đã hoàn thành)

- [x] **Tách Repository độc lập**: Clone và đẩy toàn bộ mã nguồn lên GitHub cá nhân [phanhuynh2606/ytmusic-desktop](https://github.com/phanhuynh2606/ytmusic-desktop).
- [x] **Đổi tên ứng dụng**: Cập nhật toàn bộ metadata, window title, toolbar, installer config sang **Music Desktop App**.
- [x] **Thiết kế lại Icon ứng dụng**: Tạo mới và thay thế toàn bộ 25 file icon (Windows `.ico` đa độ phân giải, PNG mọi kích cỡ, macOS `.icns`, logo, system tray).
- [x] **Tài liệu hóa Codebase**: Tạo file [CODEBASE.md](./CODEBASE.md) mô tả chi tiết kiến trúc và luồng chạy của dự án.

---

## 🚀 Giai đoạn 1: Ưu tiên triển khai ngay (Phase 1: Quick Wins)

### 1. 🇻🇳 Hỗ trợ Tiếng Việt (i18n Localization)
- [x] Xây dựng bộ từ điển Tiếng Việt đầy đủ tại `apps/ytmdesktop2/src/translations/vi-vn.json`.
- [x] Cải tiến hệ thống `src/translations/index.ts` để nạp động ngôn ngữ theo cài đặt thay vì chỉ hardcode tiếng Anh.
- [x] Bổ sung mục chọn ngôn ngữ **(Tiếng Việt / English)** trong bảng Cài đặt (Settings).
- [x] Lưu lựa chọn ngôn ngữ vào `settings store` để giữ nguyên khi khởi động lại app.

### 2. 🎨 Bộ Theme độc quyền (Preset Themes)
- [x] Tích hợp sẵn theme **OLED Pure Black** (nền đen sâu 100%, tăng tương phản, siêu tiết kiệm pin).
- [x] Tích hợp sẵn theme **Cyberpunk Neon** (tím hồng neon đồng bộ với nhận diện logo mới của app).
- [x] Tích hợp sẵn theme **Windows 11 Mica Glass** (hiệu ứng kính mờ acrylic trong suốt phong cách Fluent).
- [x] Tích hợp sẵn theme **iOS Liquid Glass** (hiệu ứng kính lỏng Apple trong suốt phủ mờ specular highlight).
- [x] Thêm bộ thẻ Card trực quan chọn nhanh các Theme có sẵn trong Settings mà không cần người dùng tự dán mã CSS.

### 3. ⏰ Hẹn giờ tắt nhạc (Sleep Timer)
- [x] Tạo module đếm ngược thời gian trong Main Process: hỗ trợ dừng phát nhạc (Pause) hoặc đóng app hoàn toàn.
- [x] Hỗ trợ các mốc thời gian: *15 phút, 30 phút, 45 phút, 1 giờ, hoặc Tắt sau khi hết bài hát hiện tại*.
- [x] Thêm nút hẹn giờ trực tiếp trên thanh Toolbar và menu chuột phải ở Khay hệ thống (System Tray).

---

## ⚡ Giai đoạn 2: Tính năng nâng cao độc quyền (Phase 2: Killer Features)

### 4. 🎚️ Bộ cân chỉnh âm thanh (Equalizer 10-Band EQ & Bass Boost)
- [x] Tiêm `Web Audio API` vào luồng audio của thẻ `<video>`/`<audio>` trong YouTube Music.
- [x] Tạo giao diện chỉnh Equalizer 10 dải tần số (32Hz đến 16kHz).
- [x] Cài sẵn các cấu hình âm thanh phổ biến: *Bass Boost, Vocal Boost, Rock, Pop, Classical, Acoustic, Electronic, Hip-Hop*.
- [x] Lưu và khôi phục cấu hình EQ cho từng thể loại nhạc.

### 5. 🪟 Cửa sổ Mini Player nổi ghim trên màn hình (Floating Always-on-Top)
- [x] Tạo cửa sổ widget nhỏ gọn có tính năng `Always on Top` (nằm trên mọi ứng dụng/game).
- [x] Hiển thị ảnh bìa động, thanh tiến độ bài hát, các nút điều khiển nhanh.
- [x] Tích hợp hiển thị lời bài hát (lyrics) thu nhỏ chạy chữ theo nhạc.
- [x] Cho phép kéo thả vị trí và chỉnh độ trong suốt (opacity).

### 6. 🛡️ Tự động xử lý quảng cáo (Ad Auto-Skip & Smart Mute)
- [ ] Script ngầm tự động nhận diện và click nút "Bỏ qua quảng cáo" (Skip Ad) ngay khi xuất hiện.
- [ ] Tự động tắt tiếng (Mute) và tăng tốc phát trong thời gian chờ nếu gặp quảng cáo không cho phép skip.

---

## 📦 Giai đoạn 3: Tối ưu & Đóng gói phát hành (Phase 3: Release)

- [x] Dọn dẹp các module và tài nguyên không dùng đến để giảm dung lượng file cài đặt `.exe`.
- [x] Chạy thử nghiệm quy trình build đóng gói Windows: `pnpm run release:pack:win` / `pnpm release:compile`.
- [x] Kiểm tra tính tương thích của file cài đặt trên Windows 10 và Windows 11.
- [x] Cấu hình GitHub Actions (CI/CD) để tự động xuất file cài đặt mỗi khi tạo tag Release trên GitHub.

