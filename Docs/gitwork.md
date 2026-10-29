# Luồng làm việc Git — ETM

Nguồn phân việc: **Backlog_ETM.xlsx** (ID, Sprint, Assignee, Status). Tạo nhánh ngắn hạn khi một task được nhận; không tạo sẵn nhánh cho toàn bộ Epic.

> **Cần chốt công nghệ FE:** backlog mô tả React + Vite, còn repo hiện khai báo React Native + Expo. Cập nhật một trong hai theo quyết định của nhóm trước khi triển khai giao diện.

## Cấu trúc nhánh

~~~text
main                          Bản đã release
└── dev                       Tích hợp sprint, phục vụ demo
    ├── feature/BE-1.1-user-model    Task backend của E1
    ├── feature/FE-1.2-login         Task frontend của E1
    └── ...                          Tạo khi nhận task, xóa sau merge
~~~

Tên nhánh: **feature/{ID}-{slug}**, dùng đúng ID trong backlog. Ví dụ **feature/BE-4.1-club-team-model**. Với bug có ID, dùng **fix/{ID}-{slug}**. Nếu một task cần nhiều người làm, thống nhất một người giữ PR hoặc chia task con. Không dùng một nhánh Epic kéo dài qua nhiều task/sprint.

Các nhánh Epic cũ (**feature/auth**, **feature/club**, **feature/tournament**, **feature/match**, **feature/notification**, **feature/prediction**, **feature/setup**, **feature/admin**, **feature/application**, **feature/bracket**, **feature/protest**, **feature/public**) không có commit riêng so với **dev** tại thời điểm rà soát. Dọn chúng sau khi xác minh không có PR đang mở hoặc thành viên nào đang dựa vào chúng. Nhánh task mới phải được tạo từ **dev** mới nhất.

## Epic và sprint

| Sprint | Thời gian | Epic theo backlog |
| --- | --- | --- |
| 1 | 14/09–27/09/2026 | E0 Setup, E1 Authentication, E13 Admin Account |
| 2 | 28/09–11/10/2026 | E4 Club, E7 Tournament, E14 Admin Club & Game, E15 Notification Template & Ban; thêm BE-1.14, BE-1.15, FE-1.9 |
| 3 | 12/10–25/10/2026 | E5 Tournament Application & Roster, E8 Application Review, E9 Roster Approval, E10 Bracket, E11 Match Result |
| 4 | 26/10–08/11/2026 | E2 Public Browsing, E3 Pick'em, E6 Protest, E12 Protest Handling, E16 Content & Report, E17 Security Policies |

Tên nhánh lấy từ **ID task**, không lấy từ tên Epic. E15 có cả Notification và Ban, nên không gộp mọi việc E15 vào một nhánh notification. FE-1.9 thuộc E1 nhưng làm ở Sprint 2; vẫn dùng ID FE-1.9.

## Quy trình cho một task

### 1. Nhận task và tạo nhánh

Sprint Planning gán **Assignee**, ước lượng và cập nhật **Status** trong backlog. Ví dụ BE-1.1 là **Model Account/User**; FE-1.2 là **Trang Login**. Không gán người dựa trên ví dụ trong tài liệu.

~~~bash
git switch dev
git pull --ff-only origin dev
git switch -c feature/BE-1.1-user-model
~~~

Nếu pull báo **dev** đã phân kỳ, kiểm tra lịch sử/PR trước khi xử lý. Không dùng reset --hard hoặc force push để bỏ commit của người khác.

### 2. Làm việc và mở PR

~~~bash
git add <cac-file-cua-task>
git commit -m "feat(BE-1.1): add account model"
git push -u origin feature/BE-1.1-user-model
~~~

Mở PR **feature/BE-1.1-user-model → dev**. Ghi ID task, thay đổi chính, cách kiểm tra và ảnh chụp nếu là UI; mời ít nhất một thành viên review. Merge khi code chạy, kiểm tra liên quan đạt và review xong. Không push trực tiếp vào **dev** hoặc **main**.

Khi **dev** tiến lên trong lúc PR còn mở:

~~~bash
git fetch origin
git switch feature/BE-1.1-user-model
git merge origin/dev
git push
~~~

Nếu có conflict, sửa các file được báo, git add các file đó rồi git commit để hoàn tất merge. Chạy lại kiểm tra bị ảnh hưởng. Xem thay đổi trước khi staging.

### 3. Sau khi merge

Xóa nhánh task trên GitHub và tại máy của người làm. Bắt đầu task tiếp theo bằng nhánh **mới từ dev**, kể cả khi hai task cùng Epic:

~~~bash
git switch dev
git pull --ff-only origin dev
git branch -d feature/BE-1.1-user-model
git switch -c feature/BE-1.2-register
~~~

Cập nhật task đã hoàn tất trong backlog sau khi PR được merge và có bằng chứng kiểm tra.

## Commit và review

~~~text
<type>(<task-id>): <mo-ta-ngan>
feat(BE-1.1): add account model
fix(BE-7.2): validate tournament status
docs: update Git workflow
~~~

Type thường dùng: **feat**, **fix**, **refactor**, **test**, **docs**, **chore**. Giữ commit nhỏ, có nội dung rõ. PR chỉ chứa một task hoặc một phần việc độc lập có thể review và merge. Nếu BE và FE là hai task khác ID, tạo hai nhánh/PR; thống nhất API contract trước khi làm song song.

Khuyến nghị bảo vệ **main** và **dev** trên GitHub: yêu cầu PR và ít nhất một review; yêu cầu kiểm tra tự động khi dự án có CI. Không force push hoặc xóa hai nhánh này.

## Release cuối sprint

Khi các task cần demo đã vào **dev**, kiểm thử luồng tích hợp và chuẩn bị dữ liệu demo. Sau khi nhóm đồng ý release, mở PR **dev → main**, review và merge. Gắn tag nếu nhóm dùng tag, ví dụ **sprint-4**. Sau release, đồng bộ commit trên **main** về **dev** qua PR **main → dev** nếu hai nhánh đã phân kỳ (chẳng hạn merge commit hoặc hotfix trên main). Task mới vẫn luôn tách từ **dev**.

Không merge trực tiếp bằng lệnh vào **main** ở máy cá nhân. Nếu cần hotfix production, tách **fix/{ID}-{slug}** từ **main**, PR vào **main**, rồi đưa thay đổi đó về **dev**.
