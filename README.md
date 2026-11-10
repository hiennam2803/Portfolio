# Portfolio — "Spec Sheet" (HTML / CSS / JavaScript thuần)

Một trang duy nhất, thiết kế như **bộ bản vẽ kỹ thuật**: mỗi mục là một "tờ" có khung viền bản vẽ. Giao diện sáng là giấy can, giao diện tối là bản thiết kế xanh (blueprint). Có tiếng Việt và tiếng Anh.

- `index.html` — **chỉ chứa khung HTML, không có chữ nào**. Dữ liệu được trình duyệt nạp từ 3 file JSON mỗi khi mở trang: `languages.json` (chỉ chữ), `projects.json` (dự án, đường dẫn ảnh, link) và `config.json` (không phải chữ: ngày bắt đầu sự nghiệp, email/GitHub/LinkedIn, ảnh chân dung).
- Đổi ngôn ngữ: nút VI/EN ở header, hoặc `index.html?lang=en`. Lựa chọn được nhớ lại. (`en/index.html` chỉ là trang chuyển hướng cho link cũ.)

> **Phải mở qua web server**, không bấm đúp file (trình duyệt chặn đọc JSON từ `file://`). Ví dụ: `npx serve`, `python3 -m http.server`, hoặc tiện ích Live Server của VS Code. Khi đưa lên hosting thì chạy bình thường.

## Cách làm việc

| Bạn muốn sửa                               | Làm gì                                                | Cần build? |
| ------------------------------------------ | ----------------------------------------------------- | ---------- |
| Chữ, dự án, ảnh, link, ngày bắt đầu sự nghiệp | sửa `languages.json` / `projects.json` / `config.json`, tải lại trang | **Không**  |
| Cấu trúc HTML (`parts/`), CSS, JS (`src/`) | sửa file rồi chạy `node build.mjs`                    | Có         |

```
node build.mjs            # ghép một lần (cần Node.js, không cần npm install)
node build.mjs --watch    # tự ghép lại mỗi khi bạn lưu file
```

> `index.html`, `css/style.css`, `js/main.js` là file **được tạo ra**, đừng sửa trực tiếp.

## languages.json — nơi chứa toàn bộ chữ

Mỗi dòng là `"tên_biến": { "vi": "tiếng Việt", "en": "English" }`. Trong HTML (`parts/`) chữ được gắn bằng thuộc tính:

```html
<p class="role" data-t="hero.role"></p>                 <!-- nội dung -->
<button data-ta="aria-label:common.close"></button>    <!-- thuộc tính  tên:biến;tên2:biến2 -->
```

- Các dòng bắt đầu bằng `_` (ví dụ `"_hero"`) chỉ là tiêu đề ngăn cách để dễ tìm.
- **Chỉ để chữ trong `languages.json`.** Đường dẫn ảnh, URL, email, ngày tháng, con số thì không phải chữ:
  - `config.json`: `careerStart` (ngày bắt đầu đi làm), `links.email|github|linkedin`, `images.portrait` (đường dẫn ảnh chân dung). HTML đọc bằng `data-t="@links.email"` (tiền tố `@`).
  - `projects.json`: `cover` (ảnh trong danh sách) và `gallery` (danh sách ảnh trong dialog) là **đường dẫn tới file ảnh bất kỳ**, đặt tên gì cũng được.
- **Những con số do code tự đếm**, không gõ tay:
  - số năm kinh nghiệm = từ `careerStart` đến hôm nay; số dự án = số phần tử trong `projects.json`; số công nghệ = số biến `skills.*.N`;
  - số bước và thanh tiến trình của hộp thoại tin nhắn = số `.msg__step`; bộ đếm ký tự = `maxlength` của ô nhập;
  - số điểm nổi bật / số liệu của từng dự án = số biến `project.N.highlight.K` / `project.N.metric.K.value`; số ảnh = độ dài `gallery`;
  - mục kinh nghiệm, học vấn, chứng chỉ = số nhóm biến `experience.N.*`, `education.N.*`, `certificates.N.*`; thêm nhóm `N` mới là thêm một mục;
  - năm trong bản quyền: viết `{{year}}`; chữ viết tắt của logo lấy từ `site.name`; nút VI/EN lấy từ mã ngôn ngữ (tên ngôn ngữ do trình duyệt tự dịch).
- `site.*` (tên, thành phố) dùng chung toàn trang. Trong một đoạn chữ có thể viết `{{site.name}}`.
- Thiếu biến hoặc thiếu bản dịch: `node build.mjs` có cảnh báo, và console trình duyệt báo `missing key`.
- **Thêm ngôn ngữ:** thêm giá trị ngôn ngữ mới (ví dụ `"ja"`) vào từng biến. Nút chuyển ngôn ngữ tự xoay vòng theo thứ tự trong `meta.title`.
- Danh sách kỹ năng (`skills.lang.N`, `skills.fw.N`, `skills.tools.N`) và dải chữ chạy dưới phần đầu trang tự sinh từ các biến này.
- SEO: chữ được nạp bằng JavaScript nên công cụ tìm kiếm có thể chỉ thấy khung trống ở lần đọc đầu.

## Cấu trúc

```
languages.json              toàn bộ chữ, mỗi biến có bản vi + en (nạp lúc chạy)
projects.json               dữ liệu dự án không phải chữ (năm, công nghệ, đường dẫn ảnh, link) (nạp lúc chạy)
config.json                 ngày bắt đầu sự nghiệp, email/GitHub/LinkedIn, ảnh chân dung (nạp lúc chạy)
parts/                      HTML khung, không có chữ: layout · header · hero · marquee · about · skills ·
                            projects · experience · education · certificates · contact · footer · message-dialog
src/css/
  fonts / tokens / base / components / motion .css
  sections/                 mỗi mục một file
  widgets/                  hud, panel, project-dialog, message-dialog, fab
src/js/                     mỗi tính năng một file (ORDER.txt = thứ tự ghép, main luôn ở cuối)
                            i18n.js = nạp JSON + đổ chữ · projects-render.js = dựng danh sách và dialog dự án
build.mjs                   script ghép (danh sách file CSS + thứ tự mục nằm ở đầu file)
fonts/  images/
```

## Phong cách

- **Chữ:** Archivo (trục độ rộng `wdth` 62–125, dùng cho chữ hẹp khổng lồ) + JetBrains Mono cho nhãn. Cả hai tự host, có tiếng Việt.
- **Màu:** `src/css/tokens.css`. Cam tín hiệu (`--signal`) chỉ dùng cho điểm đánh dấu; xanh/mực cho phần còn lại.
- **Tiêu đề mục:** chữ lớn, gọn hơn một chút.

## Hiệu ứng

- **Khung bản vẽ (màn hình ≥ 1024px):** một khung viền quanh cửa sổ, không còn thước, khung tên hay toạ độ chuột.
- **Hero:** lưới dấu "+" xoay thành "×" và bật màu cam quanh con trỏ; chữ trong tên giãn rộng khi chuột lại gần (trục `wdth`); ảnh chân dung nổi lên và nghiêng 3D theo chuột.
- **Dự án:** bảng đăng ký, rê chuột thì cả hàng đảo màu và một tấm ảnh xem trước đi theo con trỏ, nghiêng 3D theo hướng chuột di chuyển.
- **Hộp thoại gửi tin nhắn:** mở bằng vòng tròn loe ra từ nút bạn bấm, 5 bước, câu trả lời thành chip có thể sửa, hiệu ứng thành công có pháo giấy.
- Màn chào đa ngôn ngữ lúc mở đầu (một lần mỗi phiên), chữ sáng dần khi cuộn, dải chữ chạy theo tốc độ cuộn, lớp hạt phim.
- Mọi hiệu ứng tự tắt khi bật _reduced motion_; hiệu ứng theo chuột chỉ chạy trên thiết bị có chuột.

## Chỉnh nội dung

Tìm các chỗ có dấu `[...]` (placeholder) trong `languages.json` và thay bằng nội dung thật.

| Việc                                          | File                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Tên, thành phố                                | `site.name`, `site.city` trong `languages.json` (chữ viết tắt tự lấy từ tên)              |
| Email, GitHub, LinkedIn, ngày bắt đầu đi làm  | `config.json`                                                                             |
| Tiêu đề trang, mô tả SEO                      | `meta.title`, `meta.description` trong `languages.json`                                   |
| Mọi chữ khác (hero, giới thiệu, kỹ năng ...)  | `languages.json`                                                                          |
| Thêm / sửa dự án                              | `projects.json` + nhóm `project.N.*` trong `languages.json` (xem bên dưới)                 |
| Thêm mục kinh nghiệm / học vấn / chứng chỉ    | thêm nhóm `experience.N.*` / `education.N.*` / `certificates.N.*` vào `languages.json`    |
| Ảnh chân dung (4:5)                           | `images.portrait` trong `config.json` (đường dẫn tới file ảnh)                            |
| Ảnh dự án (16:10)                             | `cover` và `gallery` trong `projects.json` (đường dẫn tới file ảnh, tên tùy ý)            |

### Thêm một dự án

1. Thêm một khối vào `projects.json`:

```json
{ "id": 4, "year": "2026", "status": "done", "tech": ["React", "Node.js"],
  "cover": "images/projects/shop.webp",
  "gallery": ["images/projects/shop-home.webp", "images/projects/shop-cart.webp"],
  "live": "https://...", "repo": "https://..." }
```

   - `status`: `done` hoặc `progress` (đổi chữ ở `dialog.status_*`). `live` / `repo` để `""` thì nút tương ứng tự ẩn.
   - Không cần khai báo số ảnh, số điểm nổi bật, số ô số liệu: code tự đếm. Muốn bớt mục nào thì xoá biến tương ứng (ví dụ xoá `project.4.metric.*` là ẩn ô số liệu).

2. Sao chép nhóm `project.3.*` trong `languages.json` thành `project.4.*` rồi viết nội dung: `title`, `summary`, `overview`, `problem`, `solution`, `result`, `role`, `duration`, `team`, `highlight.N`, `metric.N.value|label`, `caption.N`.
3. Tải lại trang (không cần build). Danh sách, dialog, nút chuyển dự án trước/sau và số thứ tự `01 / 04` đều tự cập nhật.

### Dialog chi tiết dự án

- Thanh trên: nhãn + vị trí dự án (`01 / 03`) + nút đóng. Cuối dialog có nút **Dự án trước / Dự án tiếp** (chuyển ngay, không nháy nền).
- Nội dung: trạng thái, tiêu đề, mô tả ngắn, 3 ô số liệu, tổng quan, thông tin (vai trò, thời gian, quy mô nhóm), **Vấn đề → Giải pháp → Kết quả**, điểm nổi bật, công nghệ, link xem trực tiếp / mã nguồn, nút **Sao chép liên kết**.
- Link trực tiếp: mở dự án sẽ đổi địa chỉ thành `#project-N`; truy cập `trang/#project-2` thì dialog tự mở. Đóng dialog thì focus quay lại đúng dòng dự án.
- Thư viện ảnh: vuốt (cảm ứng), kéo chuột, nút, ảnh thu nhỏ, phím ← →. Ảnh chưa có thì hiện khung giữ chỗ.
- Giao diện: `src/css/widgets/project-dialog.css` · logic: `src/js/project-dialog.js` · mẫu HTML: `src/js/projects-render.js`.

### Hộp thoại gửi tin nhắn (`parts/message-dialog.html`)

Có **hai chế độ** (hai tab ở đầu hộp thoại):

- **Nhắn tin**: chat bình thường, chỉ gồm tên, email và một tin nhắn (Enter để gửi, Shift+Enter xuống dòng). Chữ nằm ở nhóm `chat.*` trong `languages.json`.
- **Yêu cầu dự án**: 5 bước (tên, email, nhu cầu, ngân sách, hướng đi của dự án), mỗi bước là một `.msg__step`. Chữ nằm ở nhóm `msg.*`. Thêm / bớt bước thì số ô tiến trình tự khớp.
- Mở bằng phần tử có `data-message-open` (mặc định mở tab Nhắn tin) hoặc `data-message-open="brief"` (mở thẳng tab Yêu cầu dự án). Mục Liên hệ có sẵn một nút cho mỗi chế độ.
- Gửi trực tiếp: thêm `data-endpoint="https://formspree.io/f/XXXX"` vào `<form data-msg-form>` (yêu cầu dự án) và/hoặc `<form data-chat-form>` (nhắn tin; nếu bỏ trống sẽ dùng endpoint của form kia). Để trống cả hai thì mở ứng dụng thư của khách với nội dung điền sẵn.
- **Avatar** dưới cột trái: thử lần lượt `images.avatar` (ảnh bạn tự đặt) → Gravatar của email (nếu `images.gravatar` là `true` và email có đăng ký Gravatar) → `images.portrait` → chữ viết tắt. Google không cho lấy ảnh Gmail từ địa chỉ email, nên cách chắc chắn nhất là đặt ảnh vào `images/avatar.webp`.
- Giao diện: `src/css/widgets/message-dialog.css` · logic: `src/js/message-dialog.js`.
