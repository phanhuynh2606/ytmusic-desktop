# Project Guidelines & Rules (ytmusic-desktop)

## 1. Git Workflow Thường Ngày
Khi người dùng yêu cầu:
- **"commit và push"**
- **"commit and push"**
- **"đẩy code lên"**
- **"lưu và đẩy code lên git"**

Agent phải tự động thực hiện quy trình sau:
1. `git status` và `git diff --stat` để kiểm tra thay đổi.
2. Kiểm tra an toàn: Tuyệt đối không commit file `.env`, `.env.local`, file bí mật, khóa riêng tư hoặc file build tạm (`dist/`, `out/`).
3. Stage các file thay đổi hợp lệ (`git add ...`).
4. Đặt commit message chuẩn Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) phản ánh đúng các thay đổi vừa làm.
5. Thực hiện `git commit -m "..."`.
6. Push lên nhánh hiện tại (`git push origin <branch>`).
7. Báo cáo ngắn gọn mã commit hash, message và các file đã đẩy lên.

---

## 2. Quy Trình Đánh Tag & Phát Hành Bản Mới (Release Workflow)
Khi người dùng yêu cầu:
- **"tạo release mới"**
- **"đánh tag"**
- **"phát hành bản mới"**
- **"nâng version và tạo release"**

Agent phải thực hiện đúng quy trình:
1. Xác định số phiên bản tiếp theo (`vX.Y.Z`):
   - Bản vá lỗi nhỏ: Tăng `Z` (ví dụ `1.9.1` ➔ `1.9.2`).
   - Tính năng mới: Tăng `Y` (ví dụ `1.9.2` ➔ `1.10.0`).
2. Nâng số version đồng bộ trong cả 2 file:
   - `package.json` (root)
   - `apps/ytmdesktop2/package.json`
3. Commit và push lên nhánh `main`:
   ```bash
   git add package.json apps/ytmdesktop2/package.json
   git commit -m "chore: bump version to <X.Y.Z>"
   git push origin main
   ```
4. Tạo tag và push tag lên GitHub:
   ```bash
   git tag v<X.Y.Z>
   git push origin v<X.Y.Z>
   ```
5. Báo cáo cho người dùng: Tag `v<X.Y.Z>` đã được kích hoạt, GitHub Actions đang tự động đóng gói Windows `.exe` và publish release chính thức.
