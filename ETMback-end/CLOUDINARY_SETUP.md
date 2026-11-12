# Ảnh, video và tài liệu trên Cloudinary

File được upload từ trình duyệt qua `POST /api/uploads` có đăng nhập → backend chuyển buffer tới Cloudinary → trả `data.url` là URL HTTPS công khai. Các model chỉ lưu string: `avatarUrl`, `logoUrl`, `bannerUrl`, `imageUrl`, `videoUrl` hoặc mảng URL `evidenceUrls`/`documents`. Không lưu buffer, base64, Blob URL, API key hoặc secret vào MongoDB.

## Cấu hình máy hiện tại

Trong `.env` backend đã đặt theo thông tin người dùng cung cấp:

```dotenv
CLOUDINARY_CLOUD_NAME=adso3i1a
CLOUDINARY_UPLOAD_PRESET=EsportTM
CLOUDINARY_FOLDER=folder/ETM
```

Tên preset phân biệt chữ hoa/thường. Preset đang dùng là **EsportTM**, thư mục Media Library là **folder/ETM**. Đã thử upload thật ảnh PNG và video WebM bằng service của backend, sau đó đọc URL không có cookie/Authorization; cả hai trả **HTTP 200**. Phép thử chỉ tạo tài nguyên kiểm tra nhỏ, không sửa ảnh đại diện hay nội dung của người dùng.

Trong Cloudinary Console → Settings → Upload → Upload presets, dùng preset **EsportTM**, Signing mode **Unsigned**, delivery type **Upload/public**. Cho phép định dạng dùng trong hệ thống (PNG/JPG/WebP, MP4/WebM/MOV và PDF/DOC/DOCX nếu dùng tài liệu). Cho phép public ID do ứng dụng đặt nếu preset có tùy chọn chặn custom public IDs. Backend gửi `asset_folder` là thư mục con cụ thể bên dưới `folder/ETM`, đồng thời đặt public ID cùng đường dẫn. Preset không được ép một asset folder cố định làm ghi đè giá trị của request. Không cần tạo Auto Upload Mapping: đó là luồng lấy ảnh từ một website nguồn khác.

Ứng dụng backend dùng các biến `CLOUDINARY_*`, không cần `VITE_CLOUDINARY_*` ở frontend. Các giá trị `VITE_*` được cung cấp trước đó chỉ là tên cloud/preset công khai. Khi đổi preset ở Cloudinary, sửa biến backend và khởi động lại backend.

### Chế độ ký request (tùy chọn)

Nếu tài khoản có API key/secret, điền vào `.env` backend:

```dotenv
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=folder/ETM
```

Khi có đủ key/secret, service ưu tiên upload có chữ ký bằng SDK chính thức và không cần unsigned preset. API secret chỉ ở backend, không thêm vào biến `VITE_*`. Khi dùng unsigned preset, backend vẫn kiểm tra phiên đăng nhập, scope, MIME và dung lượng; preset công khai cũng nên đặt giới hạn định dạng/dung lượng phù hợp trong Cloudinary.

## Chỗ dùng trong web

| Dữ liệu | Nơi upload | Trường lưu |
|---|---|---|
| Ảnh đại diện | Hồ sơ tài khoản | Account/User.avatarUrl |
| Logo CLB | Hồ sơ CLB và quản trị CLB | Club.logoUrl |
| Logo đội | Tạo/sửa team | Team.logoUrl |
| Logo game | Quản trị game | Game.logoUrl |
| Banner giải | Bước đầu form giải đấu | Tournament.bannerUrl |
| Ảnh bìa bài viết | Quản trị nội dung | Content.imageUrl |
| Video bài viết | Quản trị nội dung | Content.videoUrl |
| Ảnh/video/tài liệu bằng chứng | Hồ sơ đăng ký, khiếu nại, kết quả và report | Các mảng URL hiện tại |

Phạm vi API: `avatar`, `club`, `club-logo`, `team`, `game`, `tournament`, `content-image`, `image` chỉ nhận ảnh; `content-video` và `video` chỉ nhận video. `application`, `protest`, `match`, `report`, `document` nhận ảnh, video và tài liệu. Quyền upload theo đúng loại dữ liệu và bản ghi (CLB quản lý/giải tổ chức/hồ sơ sở hữu) được kiểm tra ở backend. `club` vẫn cập nhật logo ngay để tương thích trang hồ sơ CLB; `club-logo` chỉ trả URL cho form quản trị lưu khi xác nhận. Upload avatar cập nhật URL ngay; các scope khác trả URL để form lưu khi bấm Lưu. Nếu bỏ form sau upload, tài nguyên đã upload vẫn ở Cloudinary; việc dọn ảnh không còn dùng/chính sách retention chưa được thêm tự động.

## Cấu trúc thư mục và tên tài nguyên

Các upload mới được phân loại như sau (gốc luôn là `folder/ETM`):

| Scope | Thư mục con |
|---|---|
| avatar | `accounts/<accountId>/avatars/YYYY/MM` |
| club, club-logo | `clubs/<clubId>/logos/YYYY/MM` |
| team | `teams/<teamId>/logos/YYYY/MM` |
| game | `games/<gameId>/logos/YYYY/MM` |
| tournament | `tournaments/<tournamentId>/banners/YYYY/MM` |
| content-image | `contents/<contentId>/images/YYYY/MM` |
| content-video | `contents/<contentId>/videos/YYYY/MM` |
| application | `applications/<applicationId>/documents/YYYY/MM` |
| protest | `protests/<protestId>/evidence/YYYY/MM` |
| match | `matches/<matchId>/evidence/YYYY/MM` |
| report | `reports/<reportId>/evidence/YYYY/MM` |
| image, video, document (API cũ) | `shared/images|videos|documents/<accountId>/YYYY/MM` |
| kiểm tra kết nối nội bộ | `system/verification/system/YYYY/MM` |

Khi upload trong form tạo mới, bản ghi chưa có ID: phần `<entityId>` được thay bằng `drafts/<accountId>`. Tên file vẫn lấy tên/tag/slug đang nhập. Các tài nguyên này vẫn có thể được dùng sau khi lưu form; không tự đổi folder khi bản ghi được tạo vì chế độ unsigned không có quyền di chuyển tài nguyên cũ. ID giúp tách riêng tài nguyên của các bản ghi trùng tên. Ngày tháng trong tên/folder dùng UTC để thống nhất giữa các máy chủ.

Ví dụ tên và public ID:

```text
folder/ETM/teams/ea26.../logos/2026/11/
  logo-g2-20261108T073000000Z-a8c12e45b990.png
folder/ETM/tournaments/ea26.../banners/2026/11/
  banner-masters-winter-2026-20261108T073000000Z-43eb38a916e2.jpg
```

Tên được chuyển thành chữ thường không dấu, bỏ ký tự đặc biệt, giới hạn phần mô tả 60 ký tự, thêm thời gian và mã ngẫu nhiên 12 ký tự để không ghi đè file cũ. Trường hợp sửa bản ghi, backend ưu tiên tag/slug/tên lấy từ database. Form gửi `scope`, `entityId` (nếu có), `assetName` (khi tạo mới), và `clubId` khi tạo đội. Không cho client tự chỉ định đường dẫn folder tùy ý.

`asset_folder` quyết định vị trí trong Media Library; chỉ đặt dấu `/` trong public ID sẽ không tự phân thư mục trong chế độ dynamic folders. Backend đặt cả hai. Với unsigned preset, tên file multipart và `filename_override` được chuẩn hóa, public ID có tên dễ đọc; với signed upload đặt thêm `display_name`. Đã kiểm tra thật preset hiện tại: tên hiển thị và asset folder đều nhận đúng, URL công khai trả HTTP 200.

Quy tắc này áp dụng cho **upload mới**. Tài nguyên cũ trong `catalog`/thư mục gốc và URL đã lưu vẫn được giữ nguyên. Đổi folder/tên tài nguyên đã có cần Cloudinary Admin API có key/secret hoặc thao tác quản trị trên Console; hiện tại ứng dụng chỉ có unsigned preset, nên không tự di chuyển/đổi tên/xóa các file cũ.

PNG/JPG/WebP tối đa **10 MB**, PDF/Word **10 MB**, MP4/WebM/MOV **50 MB**. Mỗi request một file; bằng chứng tối đa 10 file và được gửi lần lượt. Video trong bài viết/bằng chứng có trình phát; khả năng phát MOV phụ thuộc trình duyệt/codec. Cloudinary raw/PDF có thể phụ thuộc thiết lập delivery của tài khoản, vì vậy cần thử link tài liệu trên tài khoản thực trước khi dùng cho hồ sơ.

URL HTTPS do Cloudinary trả về có thể dùng từ máy/trình duyệt khác, không phụ thuộc localhost của người upload. Các URL/dữ liệu ảnh mẫu cũ tiếp tục được đọc như hiện tại; chưa tự di chuyển hoặc ghi đè toàn bộ tài nguyên cũ sang Cloudinary. Không đổi các trường hình ảnh thành object/Buffer và không cần migration cho các URL đang có. `Content.videoUrl` là string tùy chọn mới.

## Kiểm tra kết nối thực tế

Chạy từ `ETMback-end`:

```powershell
# Chỉ kiểm tra có cấu hình, không tạo file trên cloud.
node src/scripts/check-cloudinary.mjs

# Tạo một PNG kiểm tra rồi mở URL công khai; có tạo tài nguyên trên Cloudinary.
node src/scripts/check-cloudinary.mjs --upload

# Upload video kiểm tra do bạn chọn, rồi kiểm tra URL công khai.
node src/scripts/check-cloudinary.mjs --upload --video path/to/clip.webm
```

Unsigned upload không gửi tham số `overwrite`/`allowed_formats`; Cloudinary giới hạn tập tham số này và tự áp dụng chính sách của preset. Backend vẫn kiểm tra MIME/dung lượng trước khi gửi. Tên cloud/preset/folder là thông tin công khai; secret dùng cho chế độ signed chỉ đặt ở backend.

## Kiểm chứng

- `test/storage-word.test.js`: chế độ ký/preset, resource image/video/raw, URL HTTPS, giới hạn file, lỗi cấu hình và không trả thông tin secret.
- `test/week8.integration.test.js`: API upload dùng SDK mock; lưu URL avatar/logo vào MongoDB; chặn role/scope sai, SVG và ảnh quá dung lượng; lưu ảnh/video bài viết và đọc công khai.
- FE `tests/e2e/cloud-media.spec.ts`: chọn ảnh/video → lưu bài → khách đọc URL đã lưu. File media/response được mô phỏng; không khẳng định khả năng decode/phát video thật từ fixture giả.
- Các test tự động không ghi dữ liệu demo hay file kiểm thử hàng loạt lên tài khoản Cloudinary thật.

Nguồn: [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference), [Node.js upload](https://cloudinary.com/documentation/node_image_and_video_upload). Dùng URL delivery `secure_url`; `image`, `video`, `raw` là resource type của SDK. File raw giữ đuôi trong public ID, còn ảnh/video dùng ID riêng không đuôi.
