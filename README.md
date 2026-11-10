# Portfolio — "Spec Sheet" (HTML / CSS / JavaScript thuần)

Một trang duy nhất, thiết kế như **bộ bản vẽ kỹ thuật**: mỗi mục là một "tờ" có khung viền bản vẽ. Giao diện sáng là giấy can, giao diện tối là bản thiết kế xanh (blueprint). Có tiếng Việt và tiếng Anh.

- `index.html` — tiếng Việt · `en/index.html` — tiếng Anh (đã ghép sẵn, bấm đúp là xem được)

## Cách làm việc

1. Sửa chữ trong `languages.json`, dự án trong `projects.json`, giao diện trong `parts/` (HTML) hoặc `src/` (CSS, JS).
2. Ghép lại (cần [Node.js](https://nodejs.org), **không cần `npm install`**):

```
node build.mjs            # ghép một lần
node build.mjs --watch    # tự ghép lại mỗi khi bạn lưu file
```

> `index.html`, `en/index.html`, `css/style.css`, `js/main.js` là file **được tạo ra**, đừng sửa trực tiếp.

## languages.json — nơi chứa toàn bộ chữ

Mỗi dòng là `"tên_biến": { "vi": "tiếng Việt", "en": "English" }`. Trong HTML chỉ cần viết `{{tên_biến}}`:

```json
"hero.role": { "vi": "Lập trình viên Frontend", "en": "Frontend Developer" }
```
```html
<p class="role">{{hero.role}}</p>
```

- Các dòng bắt đầu bằng `_` (ví dụ `"_hero"`) chỉ là tiêu đề ngăn cách để dễ tìm, build bỏ qua.
- `site.*` (tên, chữ viết tắt, email, GitHub, LinkedIn, thành phố) dùng chung toàn trang. Đổi một chỗ là đổi mọi nơi. Trong một đoạn chữ có thể viết `{{site.name}}`.
- Thiếu bản dịch hoặc gõ sai tên biến thì lúc build có cảnh báo / báo lỗi rõ ràng; biến nào không còn dùng cũng được liệt kê.
- **Thêm ngôn ngữ:** thêm một dòng vào `LANGS` trong `build.mjs`, rồi thêm giá trị ngôn ngữ đó (ví dụ `"ja"`) vào từng biến.
- Dải chữ chạy ở dưới phần đầu trang tự lấy từ các biến `skills.lang.N`, `skills.fw.N`, `skills.tools.N`.

## Cấu trúc

```
languages.json              toàn bộ chữ, mỗi biến có bản vi + en
projects.json               dữ liệu dự án không phải chữ (năm, công nghệ, link, số ảnh ...)
parts/                      HTML dùng chung cho mọi ngôn ngữ: layout · header · hero · marquee · about ·
                            skills · projects (+ project = mẫu một dự án) · experience · education ·
                            certificates · contact · footer · message-dialog
src/css/
  fonts / tokens / base / components / motion .css
  sections/                 mỗi mục một file
  widgets/                  hud, panel, project-dialog, message-dialog, fab
src/js/                     mỗi tính năng một file (ORDER.txt = thứ tự ghép, main luôn ở cuối)
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
| Thêm mục kinh nghiệm / chứng chỉ              | sao chép một khối `<li data-reveal>` trong `parts/experience.html` / `certificates.html`, thêm biến tương ứng |
| Ảnh chân dung (4:5)                           | `images/portrait.webp` (hoặc đổi `src` trong `parts/hero.html`)                           |
| Ảnh dự án (16:10)                             | `images/projects/project-N.webp` (ảnh trong danh sách), `project-N-1.webp`, `project-N-2.webp` ... (ảnh trong dialog) |
| Tên miền thật                                 | `SITE_URL` ở đầu `build.mjs` (dùng cho canonical, hreflang và link chia sẻ dự án)          |

### Thêm một dự án

1. Thêm một khối vào `projects.json`:

```json
{ "id": 4, "year": "2026", "status": "done", "tech": ["React", "Node.js"],
  "images": 3, "highlights": 3, "metrics": 3, "live": "https://...", "repo": "https://..." }
```

   - `status`: `done` hoặc `progress` (đổi chữ ở `dialog.status_*`). `live` / `repo` để `""` thì nút tương ứng tự ẩn.
   - `images`, `highlights`, `metrics`: số ảnh, số điểm nổi bật, số ô số liệu (đặt `0` để ẩn mục đó).

2. Sao chép nhóm `project.3.*` trong `languages.json` thành `project.4.*` rồi viết nội dung: `title`, `summary`, `overview`, `problem`, `solution`, `result`, `role`, `duration`, `team`, `highlight.N`, `metric.N.value|label`, `caption.N`.
3. `node build.mjs`. Danh sách, dialog, nút chuyển dự án trước/sau và số thứ tự `01 / 04` đều tự cập nhật.

### Dialog chi tiết dự án

- Thanh trên: nhãn + vị trí dự án (`01 / 03`) + nút đóng. Cuối dialog có nút **Dự án trước / Dự án tiếp** (chuyển ngay, không nháy nền).
- Nội dung: trạng thái, tiêu đề, mô tả ngắn, 3 ô số liệu, tổng quan, thông tin (vai trò, thời gian, quy mô nhóm), **Vấn đề → Giải pháp → Kết quả**, điểm nổi bật, công nghệ, link xem trực tiếp / mã nguồn, nút **Sao chép liên kết**.
- Link trực tiếp: mở dự án sẽ đổi địa chỉ thành `#project-N`; truy cập `trang/#project-2` thì dialog tự mở. Đóng dialog thì focus quay lại đúng dòng dự án.
- Thư viện ảnh: vuốt (cảm ứng), kéo chuột, nút, ảnh thu nhỏ, phím ← →. Ảnh chưa có thì hiện khung giữ chỗ.
- Giao diện: `src/css/widgets/project-dialog.css` · logic: `src/js/project-dialog.js` · mẫu HTML: `parts/project.html`.

### Hộp thoại gửi tin nhắn (`parts/*/message-dialog.html`)

- Mở bằng phần tử có `data-message-open` (nút trên header, huy hiệu quay ở ảnh chân dung, nút ở mục Liên hệ, nút nổi). Mục Liên hệ không còn form riêng, chỉ có nút này.
- Sửa câu hỏi / lựa chọn trong nhóm `msg.*` của `languages.json` (mỗi bước là một `.msg__step` trong `parts/message-dialog.html`). Thêm / bớt bước thì đổi số ô trong `.msg__progress` cho khớp.
- Gửi trực tiếp: thêm `data-endpoint="https://formspree.io/f/XXXX"` vào `<form data-msg-form>` trong `parts/message-dialog.html`; để trống thì mở ứng dụng thư của khách với nội dung đã điền sẵn.
- Giao diện: `src/css/widgets/message-dialog.css` · logic: `src/js/message-dialog.js`.
