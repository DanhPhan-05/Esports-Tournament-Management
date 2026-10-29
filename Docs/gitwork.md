# Quy trình Git cho một thành viên ETM

Tài liệu này theo một ví dụ xuyên suốt: **BE-1.1 — Model Account/User** trong backlog. Người nhận task tạo file **ETMback-end/src/models/Account.js** trên nhánh **feature/BE-1.1-user-model** và mở Pull Request (PR) vào **dev**. Tên file trong ví dụ là lựa chọn triển khai; nếu nhóm đã thống nhất tên khác, dùng đúng đường dẫn thực tế ở các lệnh thêm file và kiểm tra.

> **Trước khi nhận task FE:** backlog mô tả React + Vite, còn repo hiện khai báo React Native + Expo. Nhóm cần chốt một stack và đồng bộ repo/backlog.

## 1. Quy tắc nhánh

~~~text
main                             Bản đã release; chỉ nhận PR release
└── dev                          Tích hợp và demo của sprint
    └── feature/BE-1.1-user-model    Nhánh ngắn hạn cho một task
~~~

- Tạo nhánh từ **dev** mới nhất theo mẫu **feature/{ID}-{slug}**; với bug có ID dùng **fix/{ID}-{slug}**.
- Một nhánh/PR có phạm vi một task hoặc một phần độc lập có thể review. Không làm nhiều task chung trên nhánh Epic dài hạn.
- Không push trực tiếp vào **dev** hoặc **main**, không force push các nhánh dùng chung. Mỗi PR cần ít nhất một người khác review và kiểm tra liên quan đạt trước khi merge.
- Người làm task cập nhật Status trong backlog: **In progress** khi bắt đầu, **Completed** sau khi PR đã merge và có bằng chứng kiểm tra.

## 2. Chuẩn bị máy và lấy code

Chạy trong PowerShell. Chỉ cần clone một lần trên máy mới:

~~~powershell
git clone https://github.com/DanhPhan-05/Esports-Tournament-Management.git
cd Esports-Tournament-Management
git switch dev
git pull --ff-only origin dev
git status --short --branch
~~~

Nếu đã clone trước đó, mở terminal tại thư mục repo rồi chạy từ **git switch dev**. Trước khi chuyển nhánh hoặc pull, xem **git status --short --branch**. Nếu còn file đang sửa, xử lý theo mục 5; không kéo code đè lên việc chưa lưu.

Kiểm tra Git đang dùng đúng repo và nhánh:

~~~powershell
git remote -v
git branch -vv
git log -1 --oneline
~~~

## 3. Ví dụ đầy đủ: BE-1.1

### Bước 1 — Nhận task và tách nhánh

Xác nhận BE-1.1 được giao cho mình, đọc Description/tiêu chí hoàn thành trong backlog. Sau đó:

~~~powershell
git switch dev
git pull --ff-only origin dev
git switch -c feature/BE-1.1-user-model
git status --short --branch
~~~

Dòng trạng thái cuối phải là **feature/BE-1.1-user-model** và chưa có thay đổi từ task khác.

### Bước 2 — Code và kiểm tra

Triển khai model theo backlog: dữ liệu tài khoản, role/status, xác minh/khóa đăng nhập, thiết lập privacy/notification, timestamps và unique index cần thiết. Khi đã tạo file, kiểm tra phạm vi thay đổi:

~~~powershell
git status --short
git diff --check
git diff --stat
node --check ETMback-end/src/models/Account.js
~~~

**node --check** chỉ kiểm tra cú pháp. Chạy thêm test hoặc kiểm tra model/database theo tiêu chí của task. Hiện repo chưa có script **npm test**; chỉ chạy lệnh đó khi team đã thêm test script. Không coi kiểm tra cú pháp là bằng chứng hoàn thành toàn bộ model.

### Bước 3 — Stage và commit đúng file

~~~powershell
git add -- ETMback-end/src/models/Account.js
git diff --cached --stat
git diff --cached --check
git diff --cached
git commit -m "feat(BE-1.1): add account model"
git status --short --branch
~~~

Xem diff staged trước khi commit để tránh đưa file môi trường, dữ liệu demo hoặc thay đổi của task khác vào PR. Nếu task cần thêm file test, thêm đúng đường dẫn file test bằng một lệnh **git add --** riêng. Ưu tiên commit nhỏ theo từng phần có nghĩa.

### Bước 4 — Push và mở PR

~~~powershell
git push -u origin feature/BE-1.1-user-model
~~~

Trên GitHub, chọn **base: dev** và **compare: feature/BE-1.1-user-model**. Ví dụ:

- Tiêu đề: **[BE-1.1] Add Account/User model**
- Mô tả: trường/index đã thêm, cách kiểm tra, điểm cần reviewer chú ý và liên kết task BE-1.1.
- Reviewer: ít nhất một thành viên khác. Kiểm tra tự động phải đạt nếu repo đã có CI; PR cần được review trước khi merge.

Git chỉ push commit; việc tạo và review PR thực hiện trên GitHub. Không mở PR vào **main** cho task này.

### Bước 5 — Sửa theo review

Ở nhánh task, sửa file rồi commit thêm và push. PR hiện có tự cập nhật:

~~~powershell
git switch feature/BE-1.1-user-model
git status --short --branch
git add -- ETMback-end/src/models/Account.js
git diff --cached --check
git commit -m "fix(BE-1.1): address model review"
git push
~~~

Chạy lại kiểm tra bị ảnh hưởng và trả lời comment review bằng kết quả cụ thể. Không cần mở PR mới.

### Bước 6 — Sau khi PR được merge

Xác nhận PR đã **Merged** trên GitHub trước khi dọn nhánh. GitHub có thể tự xóa remote branch. Tại máy:

~~~powershell
git switch dev
git pull --ff-only origin dev
git branch -d feature/BE-1.1-user-model
git fetch --prune origin
git status --short --branch
~~~

Nếu GitHub chưa xóa remote branch và nhóm giao người làm task dọn nhánh, sau khi đã xác nhận PR merge:

~~~powershell
git push origin --delete feature/BE-1.1-user-model
~~~

Task kế tiếp phải bắt đầu bằng **nhánh mới từ dev**, kể cả khi cùng Epic. Ví dụ, sau khi nhận BE-1.2:

~~~powershell
git switch dev
git pull --ff-only origin dev
git switch -c feature/BE-1.2-register
~~~

## 4. Khi dev thay đổi trong lúc PR còn mở

Cập nhật nhánh task trước khi giải quyết xung đột hoặc chạy lại kiểm tra:

~~~powershell
git switch feature/BE-1.1-user-model
git status --short --branch
git fetch origin
git merge origin/dev
~~~

Nếu merge thành công, chạy lại kiểm tra liên quan rồi **git push**. Nếu có conflict, xem mục 5. Không sửa trực tiếp **dev** để “giúp” PR của mình merge.

## 5. Sự cố thường gặp

### Tên nhánh task đã tồn tại

Kiểm tra nhánh ở máy và trên remote trước khi tạo nhánh khác:

~~~powershell
git fetch origin
git branch --list feature/BE-1.1-user-model
git branch -r --list origin/feature/BE-1.1-user-model
~~~

Nếu đó là nhánh của chính task mình đang tiếp tục, chuyển sang nhánh có sẵn rồi cập nhật từ **dev** theo mục 4. Nếu nhánh thuộc người khác, phối hợp để tránh hai người ghi đè nhau; không xóa hoặc force push nhánh đó.

### Có thay đổi chưa commit, không chuyển nhánh/pull được

Ưu tiên commit phần việc đã hoàn chỉnh trên nhánh task. Nếu cần cất tạm cả file chưa được Git theo dõi:

~~~powershell
git status --short
git stash push -u -m "WIP BE-1.1 before sync"
git switch dev
git pull --ff-only origin dev
git switch feature/BE-1.1-user-model
git stash list
git stash pop
git status --short
~~~

**git stash pop** có thể gây conflict; sửa như conflict thông thường. Kiểm tra nội dung sau pop trước khi code tiếp. Không dùng stash như nơi lưu việc dài hạn.

### Merge origin/dev bị conflict

Git sẽ ghi danh sách file conflict. Mở từng file, chọn nội dung đúng và xóa các dấu **<<<<<<<**, **=======**, **>>>>>>>**; sau đó:

~~~powershell
git status
git diff --check
git add -- ETMback-end/src/models/Account.js
git commit
git push
~~~

Thay đường dẫn trong **git add** bằng đúng file đang conflict; có thể có nhiều file. **git commit** hoàn tất merge sau khi mọi conflict đã được giải quyết. Nếu chưa thể giải quyết và muốn quay về trước lần merge này:

~~~powershell
git merge --abort
git status --short --branch
~~~

Không dùng **git add .** khi chưa xem toàn bộ file thay đổi.

### Push bị từ chối vì remote branch đã có commit mới

Có thể thành viên khác đã đẩy lên cùng nhánh. Kiểm tra lịch sử trước, không force push:

~~~powershell
git fetch origin
git log --oneline --left-right HEAD...origin/feature/BE-1.1-user-model
git merge origin/feature/BE-1.1-user-model
git push
~~~

Nếu thấy commit không thuộc task hoặc không rõ nguồn gốc, trao đổi với người đã push trước khi merge.

### Pull dev báo không thể fast-forward

Local **dev** có commit riêng hoặc lịch sử đã phân kỳ. Không reset/force push khi chưa hiểu commit đó:

~~~powershell
git fetch origin
git status --short --branch
git log --oneline --left-right dev...origin/dev
~~~

Nếu đó là commit của mình đặt nhầm trên **dev**, giữ lại SHA và nhờ người phụ trách repo xử lý trước khi tiếp tục. Nếu có thay đổi của người khác, phối hợp với nhóm.

### Staged nhầm file

Bỏ file khỏi staging nhưng giữ nội dung đang sửa, rồi kiểm tra lại:

~~~powershell
git restore --staged -- path/to/wrong-file
git status --short
git diff --cached --stat
~~~

### git branch -d báo nhánh chưa merge

Nếu PR được **squash merge**, commit của nhánh không còn là ancestor trực tiếp của **dev**. Kiểm tra PR đã Merged và nội dung task đã có trên **dev**. Khi hai điều kiện này đúng, mới dùng:

~~~powershell
git branch -D feature/BE-1.1-user-model
~~~

Không dùng **-D** chỉ để bỏ qua cảnh báo khi PR còn mở hoặc commit chưa được lưu ở nơi khác.

### Commit hoặc push lỗi

- **Author identity unknown:** đặt tên/email cho riêng repo bằng **git config user.name "Tên của bạn"** và **git config user.email "email-của-bạn"**, rồi commit lại. Dùng email gắn với tài khoản GitHub nếu muốn commit hiện đúng tác giả.
- **Authentication failed:** đăng nhập lại tài khoản có quyền push vào repo; không dán token vào URL, commit hoặc chat.
- **Network/DNS error:** kiểm tra mạng/VPN rồi thử lại. Commit tại máy vẫn còn; không cần tạo nhánh hoặc commit mới.
- **Không thấy thay đổi trên PR:** chạy **git status --short --branch** và **git log -1 --oneline** để chắc đang ở đúng nhánh, đã commit và đã **git push**.

## 6. Cuối sprint

Một thành viên chỉ merge task của mình vào **dev** qua PR sau review. Người phụ trách release kiểm thử trên **dev**, mở PR **dev → main**, review rồi merge khi nhóm đồng ý. Nếu có hotfix trên **main** hoặc hai nhánh phân kỳ sau release, đồng bộ **main → dev** qua PR. Không chạy **git merge dev** rồi push thẳng **main** trên máy cá nhân.
