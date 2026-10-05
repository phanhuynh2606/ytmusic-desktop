# Project Guidelines & Rules

## Git Workflow
Khi người dùng yêu cầu:
- **"commit và push"**
- **"commit and push"**
- **"đẩy code lên"**
- **"lưu và đẩy code lên git"**

Agent phải tự động thực hiện quy trình sau:
1. `git status` và `git diff --stat` để kiểm tra thay đổi.
2. Kiểm tra an toàn: Tuyệt đối không commit file `.env`, file bí mật, khóa riêng tư hoặc file build tạm.
3. Stage các file thay đổi hợp lệ (`git add ...`).
4. Đặt commit message chuẩn Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) phản ánh đúng các thay đổi vừa làm.
5. Thực hiện `git commit -m "..."`.
6. Push lên nhánh hiện tại (`git push origin <branch>`).
7. Báo cáo ngắn gọn mã commit hash, message và các file đã đẩy lên.
