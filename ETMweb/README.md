# ETM Web — Sprint 1–4

Ứng dụng web độc lập dùng React, TypeScript, Vite và React Router DOM. `ETMfront-end` tiếp tục là ứng dụng Expo; `ETMback-end` cung cấp API chung. Không cần khởi chạy Expo để dùng web.

## Chạy development

Yêu cầu Node.js >= 22.12, backend đã cài dependency và kết nối MongoDB.

```powershell
cd D:\FPT\Ky7_FA26\SDN302\EsportsTournamentManagement\ETMback-end
npm run dev
```

Mở terminal thứ hai:

```powershell
cd D:\FPT\Ky7_FA26\SDN302\EsportsTournamentManagement\ETMweb
npm ci
npm run dev
```

Mở http://127.0.0.1:5173. Vite chuyển tiếp `/api` đến `http://127.0.0.1:5000`. Muốn đổi cổng API, copy `.env.example` thành `.env.local` và sửa `VITE_PROXY_TARGET`. Không đặt secret vào biến `VITE_*` vì chúng được đưa vào browser bundle.

Backend cần `CLIENT_URL=http://127.0.0.1:5173` để liên kết xác minh, kích hoạt và reset mật khẩu mở đúng frontend. SMTP cần được cấu hình để nhận email thật. Avatar dùng cấu hình storage của backend; nếu chưa cấu hình, giao diện báo lỗi và vẫn cho sửa các thông tin khác. Google OAuth chỉ hiện nút hoạt động khi `VITE_GOOGLE_OAUTH_ENABLED=true` và backend đã có cấu hình Google cùng callback hợp lệ.

## Các trang

| Route                                                     | Quyền          | Nội dung                                        |
| --------------------------------------------------------- | -------------- | ----------------------------------------------- |
| `/`                                                       | Public         | Trang vào hệ thống, navbar theo phiên           |
| `/register`, `/login`                                     | Public         | Đăng ký và đăng nhập                            |
| `/forgot-password`                                        | Public         | Yêu cầu đặt lại mật khẩu                        |
| `/reset-password/:token` hoặc `/reset-password?token=...` | Token          | Đặt mật khẩu mới                                |
| `/activate/:key` hoặc `/activate?token=...`               | Token          | Kích hoạt nhân sự                               |
| `/verify-email?token=...`                                 | Token          | Xác minh tài khoản đăng ký                      |
| `/oauth/callback`                                         | Cookie session | Hoàn tất đăng nhập Google                       |
| `/dashboard`                                              | Đã đăng nhập   | Không gian cá nhân                              |
| `/profile`                                                | Đã đăng nhập   | Hồ sơ, sửa thông tin, avatar                    |
| `/settings`                                               | Đã đăng nhập   | Privacy, Notification, Password                 |
| `/admin/dashboard`                                        | Administrator  | Thống kê và tài khoản mới                       |
| `/admin/accounts`                                         | Administrator  | Tìm email, lọc role/status, phân trang, tạo/sửa |
| `/admin/accounts/:id`                                     | Administrator  | Chi tiết, gửi lại kích hoạt, vô hiệu hóa        |

Administrator được chuyển đến `/admin/dashboard`; ba vai trò khác đến `/dashboard`. Backend vẫn là nơi kiểm tra quyền cuối cùng. Các màn hình nghiệp vụ club, tournament, notification center thuộc sprint sau, chưa đưa vào menu Sprint 1.

## Phiên đăng nhập

Web dùng cookie HttpOnly do backend phát hành, Axios `withCredentials` và header `X-CSRF-Token`. Không lưu JWT vào localStorage/sessionStorage và không đọc token từ URL. Chỉ tùy chọn giao diện sáng/tối được lưu localStorage.

Ảnh/video được gửi qua backend tới Cloudinary; các form chỉ lưu URL trả về. Thiết lập cloud/preset hoặc API key/secret tại backend theo [CLOUDINARY_SETUP.md](../ETMback-end/CLOUDINARY_SETUP.md); không cần secret Cloudinary trong `VITE_*`. Ảnh/tài liệu tối đa 10 MB, video MP4/WebM/MOV tối đa 50 MB. Có upload logo team, banner giải, ảnh/video bài viết và video bằng chứng.

Khi protected API trả 401, các request cùng chờ một lần refresh rồi thử lại một lần. Phiên không hợp lệ chuyển về đăng nhập; lỗi mạng hiển thị nút thử lại. Đăng xuất chỉ xóa trạng thái sau khi API thành công. Đổi mật khẩu và cập nhật tài khoản bởi admin thu hồi phiên theo backend. Nếu admin sửa chính mình, frontend yêu cầu đăng nhập lại.

## Kiểm tra và build

Customer đăng nhập mặc định về `/`; `/dashboard` là đường dẫn tương thích và chuyển về trang chủ. Trang công khai, Pick’em, hồ sơ, cài đặt và thông báo của Customer dùng chung thanh điều hướng trái thu gọn 72px trên desktop. Trên desktop, menu mở rộng đẩy và thu hẹp khung nội dung để không che trang; mobile dùng menu trượt và đóng khi điều hướng hoặc nhấn Escape. Customer không có mục “Bảng điều khiển”. Administrator, ClubManager và TournamentOrganizer vẫn dùng không gian quản lý riêng theo vai trò.

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E dùng Chromium, backend thật và MongoDB tạm qua `mongodb-memory-server` đã có trong dev dependencies của `ETMback-end` (chạy `npm ci` ở backend trước). Các cổng 5178 và 5201 phải trống. Lần đầu có thể cần Internet tải binary MongoDB/Chromium. Fixture tự tạo tài khoản `*@web.test` trong database tạm và không sử dụng `MONGO_URI` của dự án. Email và OAuth bên ngoài không được gọi. Phản hồi 429/423 và mất mạng được mô phỏng riêng để kiểm tra UI. Báo cáo ở `playwright-report/`, trace lỗi ở `test-results/`; ảnh desktop/mobile được lưu tại `docs/screenshots/`.

Build xuất `dist/`. `npm run preview` xem bundle ở cổng 4173 và tiếp tục chuyển tiếp `/api` đến `VITE_PROXY_TARGET`. Production nên phục vụ web và `/api` cùng origin qua HTTPS, chuyển `/api/*` đến Express và fallback route web về `index.html` (ví dụ Nginx `try_files $uri $uri/ /index.html`). Cookie backend có `Secure` khi production, vì vậy không thử production cookie bằng HTTP.

Chi tiết đối chiếu từng task tại [Sprint 1](docs/SPRINT1_DELIVERY.md), [Sprint 2](docs/SPRINT2_DELIVERY.md), [Sprint 3](docs/SPRINT3_DELIVERY.md) và [Sprint 4](docs/SPRINT4_DELIVERY.md).

Pick’em tại `/pickem` hiển thị danh sách sự kiện đã công bố, gồm sắp mở, đang mở và đã khóa. Chọn giải để mở sơ đồ tại `/pickem?tournamentId=...`: nhánh thắng, nhánh thua, chung kết và tái đấu có điều kiện được nối theo quan hệ trận thực tế. Chọn đội để nhập tỉ số và lưu từng trận; các vòng sau lấy đội theo chính dự đoán của người dùng. Đổi đội thắng sẽ xóa dự đoán phụ thuộc. Giải đã khóa vẫn xem được lựa chọn, điểm và tab kết quả chính thức. Có thu/phóng, cuộn trong sơ đồ và danh sách đội tham dự; không giả lập các giai đoạn Swiss chưa được backend hỗ trợ. API danh mục dùng `GET /predictions/events?view=all`; điều kiện mở/khóa và tỉ số BO vẫn được backend kiểm tra khi ghi.

Sprint 4 mở toàn bộ trang công khai, tìm kiếm, Pick’em dành cho Customer, khiếu nại CM/TO và các trang admin nội dung/báo cáo/audit/chính sách. Đi từ thanh điều hướng công khai hoặc sidebar đúng vai trò. Khởi động lại backend để nhận public match detail, danh sách trận đủ điều kiện khiếu nại và biên nhận report. Chi tiết routes, giới hạn và API ở tài liệu Sprint 4.

Sprint 3 bổ sung hồ sơ đăng ký và roster tại `/cm/applications`, `/cm/applications/new`, `/cm/applications/:id`, `/cm/applications/:id/edit`, `/cm/rosters`, `/cm/rosters/:id/edit`. Ban tổ chức đi từ chi tiết giải tới các trang `/to/tournaments/:id/applications`, `/rosters`, `/brackets`, `/matches`, `/reports`; chi tiết tại `/to/applications/:appId`, `/to/rosters/:rosterId`, `/to/matches/:id`. Bản backend cần khởi động lại để nhận hai API đọc mới và hỗ trợ upload Word. Xem [task → file và quy tắc Sprint 3](docs/SPRINT3_DELIVERY.md).

Sprint 2 bổ sung `/cm/dashboard`, `/cm/club`, `/cm/club/edit`, `/cm/members`, `/cm/teams` cho ClubManager; `/to/dashboard`, `/to/tournaments`, `/to/tournaments/new`, `/to/tournaments/:id`, `/to/tournaments/:id/edit` cho TournamentOrganizer; `/admin/clubs`, `/admin/games`, `/admin/notifications`, `/admin/bans` cho Administrator; `/notifications` cho mọi tài khoản đã đăng nhập. Manager có thể chọn CLB đang quản lý. Navbar điều hướng theo role mới và hiển thị số thông báo in-app chưa đọc.

Báo cáo chỉ được gửi bởi Club Manager của CLB tham gia một trận cụ thể. Nút nằm ở chi tiết trận đấu, với hai loại: Kết quả trận đấu và Vi phạm luật thi đấu. Không có báo cáo bài viết, tài khoản, CLB, team hoặc thành viên. Backend kiểm tra lại vai trò và quyền tham gia trận; admin xem đầy đủ tên giải và hai đội khi xử lý. Các báo cáo cũ ngoài phạm vi Match được giữ trong database nhưng không đưa vào luồng báo cáo mới.

Form giải đấu lưu giải thưởng bằng `prizePool` (số tiền dạng string) và `prizeCurrency` (VND/USD/...), có gợi ý khu vực từ các giải đã công bố và CLB đang hoạt động qua `/api/tournaments/regions`, đồng thời vẫn cho nhập khu vực mới. Slug được gợi ý từ tên và chuẩn hóa dấu gạch ngang. Giải tạo mới mặc định mở đăng ký từ hiện tại. Đã công bố và đang nhận hồ sơ là hai điều kiện riêng: form CM hiển thị cả giải sắp mở, ghi rõ khung giờ và không gửi sớm. Nút Đăng ký tham gia trên thông tin giải chuyển tới `/cm/applications/new?tournamentId=...` và chọn sẵn giải.
