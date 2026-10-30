# ETM — Esports Tournament Management

Monorepo gồm React + Vite web và Express + MongoDB API. Epic 0 dựng nền tảng; các API nghiệp vụ được phát triển ở các Epic tiếp theo.

## Yêu cầu

- Node.js 22.12+ hoặc 24+ (theo yêu cầu của Vite/Vitest đang dùng)
- MongoDB chạy local hoặc MongoDB Atlas

## Chạy local

```powershell
cd ETMback-end
npm ci
Copy-Item .env.example .env
# Cập nhật MONGODB_URI, JWT_SECRET, COOKIE_SECRET trong .env
npm run dev
```

Trong terminal khác:

```powershell
cd ETMfront-end
npm ci
Copy-Item .env.example .env
npm run dev
```

Web: `http://localhost:5173`. API health: `http://localhost:5000/api/health`. Nếu đổi port, cập nhật `CLIENT_ORIGIN` và `VITE_API_URL` tương ứng.

## Kiểm tra

```powershell
cd ETMback-end
npm test
cd ../ETMfront-end
npm test
npm run build
```

Postman collection nằm tại `ETMback-end/postman/ETM.postman_collection.json`. Hiện collection kiểm tra health và CSRF của Epic 0; chuỗi auth → đăng ký giải → roster → bracket → kết quả → khiếu nại sẽ được bổ sung cùng các API nghiệp vụ tương ứng. CI hiện chạy test, build và smoke check cho health/CSRF; chưa chạy Postman collection cho luồng nghiệp vụ chưa có API.

## Cấu trúc

- `ETMfront-end/src/pages`: trang khởi đầu và route placeholders
- `ETMfront-end/src/components`: layout, route guard và UI dùng chung
- `ETMfront-end/src/contexts`: trạng thái xác thực
- `ETMfront-end/src/services`: Axios instance
- `ETMback-end/src/app.js`: Express app và middleware toàn cục
- `ETMback-end/src/config`: MongoDB và Passport
- `ETMback-end/src/middlewares`: lỗi, JWT, vai trò, CSRF, upload
- `ETMback-end/ecosystem.config.cjs`: cấu hình PM2

Frontend dùng cookie HttpOnly cho phiên đăng nhập. Epic Authentication sẽ cung cấp `/api/auth/login`, `/api/auth/logout` và `/api/auth/me`. Google OAuth cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` và callback URL; upload ảnh cần Firebase service account và bucket. Chưa bật các dịch vụ đó khi thiếu cấu hình.

CSRF dùng `csrf-csrf` với cookie phiên được ký và token ràng buộc theo phiên. Backlog ghi `csurf`, nhưng gói đó đã được npm đánh dấu ngừng bảo trì. Khi Epic 1 triển khai đăng nhập/đăng xuất, cần đổi phiên và cấp lại CSRF token sau khi quyền thay đổi.

## Deploy demo

1. Chạy `npm ci` và `npm test` cho backend; chạy `npm ci`, `npm test`, `npm run build` cho frontend.
2. Cấu hình biến môi trường backend từ `.env.example`, frontend `VITE_API_URL` trỏ đến API public. Không đưa secret vào Vite.
3. Phục vụ `ETMfront-end/dist` qua web server có fallback về `index.html` cho React Router.
4. Chạy API bằng `npx pm2 start ecosystem.config.cjs` từ `ETMback-end`; kiểm tra `/api/health` và Postman smoke collection.
5. Nếu smoke test thất bại, triển khai lại artifact/commit trước đó, chạy `npx pm2 reload etm-api` và kiểm tra health.
