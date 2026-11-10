# Portfolio — "Spec Sheet" (HTML / CSS / JavaScript thuần)

Một trang duy nhất, thiết kế như **bộ bản vẽ kỹ thuật**: mỗi mục là một "tờ" có khung viền bản vẽ. Giao diện sáng là giấy can, giao diện tối là bản thiết kế xanh (blueprint). Có tiếng Việt và tiếng Anh.

- `index.html` — **chỉ chứa khung HTML, không có chữ nào**. Toàn bộ chữ và danh sách dự án được trình duyệt nạp từ `languages.json` + `projects.json` mỗi khi mở trang.
- Đổi ngôn ngữ: nút VI/EN ở header, hoặc `index.html?lang=en`. Lựa chọn được nhớ lại. (`en/index.html` chỉ là trang chuyển hướng cho link cũ.)

> **Phải mở qua web server**, không bấm đúp file (trình duyệt chặn đọc JSON từ `file://`). Ví dụ: `npx serve`, `python3 -m http.server`, hoặc tiện ích Live Server của VS Code. Khi đưa lên hosting thì chạy bình thường.

## Cách làm việc

| Bạn muốn sửa                               | Làm gì                                                | Cần build? |
| ------------------------------------------ | ----------------------------------------------------- | ---------- |
| Chữ (mọi thứ), dự án, link, số liệu         | sửa `languages.json` / `projects.json`, tải lại trang | **Không**  |
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
- `site.*` (tên, chữ viết tắt, email, GitHub, LinkedIn, thành phố) dùng chung toàn trang. Trong một đoạn chữ có thể viết `{{site.name}}`.
- Thiếu biến hoặc thiếu bản dịch: `node build.mjs` có cảnh báo, và console trình duyệt báo `missing key`.
- **Thêm ngôn ngữ:** thêm giá trị ngôn ngữ mới (ví dụ `"ja"`) vào từng biến. Nút chuyển ngôn ngữ tự xoay vòng theo thứ tự trong `meta.title`; với hơn 2 ngôn ngữ nhớ viết nhãn `lang.switch_*` cho ngôn ngữ kế tiếp.
- Danh sách kỹ năng (`skills.lang.N`, `skills.fw.N`, `skills.tools.N`) và dải chữ chạy dưới phần đầu trang tự sinh từ các biến này: thêm `skills.lang.4` là có thêm một mục.
- SEO: chữ được nạp bằng JavaScript nên công cụ tìm kiếm có thể chỉ thấy khung trống ở lần đọc đầu.

## Cấu trúc

```
languages.json              toàn bộ chữ, mỗi biến có bản vi + en (nạp lúc chạy)
projects.json               dữ liệu dự án không phải chữ (năm, công nghệ, link, số ảnh ...) (nạp lúc chạy)
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
| Tên, chữ viết tắt, email, GitHub, LinkedIn    | nhóm `site.*` trong `languages.json`                                                      |
| Tiêu đề trang, mô tả SEO                      | `meta.title`, `meta.description` trong `languages.json`                                   |
| Mọi chữ khác (hero, giới thiệu, kỹ năng ...)  | `languages.json`                                                                          |
| Thêm / sửa dự án                              | `projects.json` + nhóm `project.N.*` trong `languages.json` (xem bên dưới)                 |
| Thêm mục kinh nghiệm / chứng chỉ              | sao chép một khối `<li data-reveal>` trong `parts/experience.html` / `certificates.html`, thêm biến vào `languages.json` và đổi `data-t` cho khớp, rồi `node build.mjs` |
| Ảnh chân dung (4:5)                           | `images/portrait.webp` (hoặc đổi `src` trong `parts/hero.html`)                           |
| Ảnh dự án (16:10)                             | `images/projects/project-N.webp` (ảnh trong danh sách), `project-N-1.webp`, `project-N-2.webp` ... (ảnh trong dialog) |

### Thêm một dự án

1. Thêm một khối vào `projects.json`:

```json
{ "id": 4, "year": "2026", "status": "done", "tech": ["React", "Node.js"],
  "images": 3, "highlights": 3, "metrics": 3, "live": "https://...", "repo": "https://..." }
```

   - `status`: `done` hoặc `progress` (đổi chữ ở `dialog.status_*`). `live` / `repo` để `""` thì nút tương ứng tự ẩn.
   - `images`, `highlights`, `metrics`: số ảnh, số điểm nổi bật, số ô số liệu (đặt `0` để ẩn mục đó).

2. Sao chép nhóm `project.3.*` trong `languages.json` thành `project.4.*` rồi viết nội dung: `title`, `summary`, `overview`, `problem`, `solution`, `result`, `role`, `duration`, `team`, `highlight.N`, `metric.N.value|label`, `caption.N`.
3. Tải lại trang (không cần build). Danh sách, dialog, nút chuyển dự án trước/sau và số thứ tự `01 / 04` đều tự cập nhật.

### Dialog chi tiết dự án

- Thanh trên: nhãn + vị trí dự án (`01 / 03`) + nút đóng. Cuối dialog có nút **Dự án trước / Dự án tiếp** (chuyển ngay, không nháy nền).
- Nội dung: trạng thái, tiêu đề, mô tả ngắn, 3 ô số liệu, tổng quan, thông tin (vai trò, thời gian, quy mô nhóm), **Vấn đề → Giải pháp → Kết quả**, điểm nổi bật, công nghệ, link xem trực tiếp / mã nguồn, nút **Sao chép liên kết**.
- Link trực tiếp: mở dự án sẽ đổi địa chỉ thành `#project-N`; truy cập `trang/#project-2` thì dialog tự mở. Đóng dialog thì focus quay lại đúng dòng dự án.
- Thư viện ảnh: vuốt (cảm ứng), kéo chuột, nút, ảnh thu nhỏ, phím ← →. Ảnh chưa có thì hiện khung giữ chỗ.
- Giao diện: `src/css/widgets/project-dialog.css` · logic: `src/js/project-dialog.js` · mẫu HTML: `src/js/projects-render.js`.

### Hộp thoại gửi tin nhắn (`parts/*/message-dialog.html`)

- Mở bằng phần tử có `data-message-open` (nút trên header, huy hiệu quay ở ảnh chân dung, nút ở mục Liên hệ, nút nổi). Mục Liên hệ không còn form riêng, chỉ có nút này.
- Sửa câu hỏi / lựa chọn trong nhóm `msg.*` của `languages.json` (mỗi bước là một `.msg__step` trong `parts/message-dialog.html`, gắn chữ bằng `data-t` / `data-ta`). Thêm / bớt bước thì đổi số ô trong `.msg__progress` cho khớp.
- Gửi trực tiếp: thêm `data-endpoint="https://formspree.io/f/XXXX"` vào `<form data-msg-form>` trong `parts/message-dialog.html`; để trống thì mở ứng dụng thư của khách với nội dung đã điền sẵn.
- Giao diện: `src/css/widgets/message-dialog.css` · logic: `src/js/message-dialog.js`.
