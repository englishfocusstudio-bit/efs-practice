# EFS Speaking Pilot 001 — My Hobby

Demo độc lập bằng HTML/CSS/JavaScript. Không backend, API, STT, AI sửa câu hoặc TTS. Không deploy.

## Chạy cục bộ

Tại repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory .
```

Mở đường dẫn `/efs-speaking/` trên máy chạy server. Không mở bằng `file://` vì ứng dụng tải JSON. Khi kiểm tra trên điện thoại, dùng môi trường HTTPS được phép; HTTP qua IP LAN không bảo đảm quyền micro. Chưa cấu hình hosting hoặc đường hầm mạng.

## Tình trạng thật của demo

- Discover: SVG tự tạo, từ/cụm và nghĩa tiếng Việt. Các nút audio chỉ xuất hiện khi có file và script khớp.
- Listen & Notice: hội thoại tự soạn, transcript bật/tắt, nhãn mục đích Start / Respond / Follow up.
- My Own Ideas: Idea Bank, khung nói, hỗ trợ tiếng Việt, bản nháp, xác nhận câu trả lời. Ghi âm thật bằng MediaRecorder, nghe lại, tải xuống và xóa trong IndexedDB.
- Flashcards: mặt sau chỉ lấy câu đã xác nhận; sửa nháp không thay bản xác nhận. Xác nhận bản sửa cập nhật flashcard và script cá nhân. Không lấy câu mẫu làm câu trả lời cá nhân.
- Personalized Shadowing: A/B là hai vai. Lượt trả lời có `answerId` thuộc vai đang chọn được thay bằng câu đã xác nhận; nếu chưa có thì hiển thị trạng thái thiếu. Các câu hỏi cố định của vai A và lượt đối tác giữ nguyên. Ba cách luyện Listen & Repeat / Shadowing / Role Practice; chuyển lượt thủ công.
- Speak Together: hội thoại mẫu luân phiên, đổi vai, ghi âm. Không phải cuộc gọi hoặc hội thoại AI.
- Script cá nhân có thể lưu snapshot riêng trong localStorage và xuất TXT. Bản ghi có snapshot script tại thời điểm ghi; không tự biến thành audio TTS hoặc bản chép lời.
- Chủ đề và tiến độ lưu trong localStorage (`efs_speaking_v1`); âm thanh học sinh lưu trong IndexedDB (`efs-speaking-recordings`). Không dùng kho lưu của EFS Grading. Không có đồng bộ hay sao lưu máy chủ. Xóa dữ liệu trình duyệt sẽ làm mất nội dung; nên tải bản ghi và script xuống.

**Audio EFS mẫu hiện là placeholder `null`**, không có file phát âm tiếng Anh trong bản bàn giao. Vì vậy chưa thể nghiệm thu nghe hoặc shadowing bằng giọng mẫu tự nhiên. Không dùng TTS thay thế. Audio cá nhân hóa cũng chưa có; giao diện hiển thị rõ và không phát file mẫu sai nội dung. File WAV tổng hợp trong kiểm thử chỉ là fixture tĩnh trong bộ nhớ, không phải audio bài học.

## Nhập chủ đề và audio

Không cần sửa mã JavaScript để thêm topic:

1. Sao chép cấu trúc `data/my-hobby.json`, đặt `id` mới gồm chữ thường, số và dấu gạch ngang. Giữ ID câu hỏi ổn định.
2. Điền `questions` (prompt, translation, ideas, frames), `vocabulary` (text, meaning), `dialogue` (role A/B, text, purpose, questionId hoặc answerId).
3. Với media, thêm file có quyền sử dụng dưới `assets/`, khai báo đường dẫn tương đối tính từ `efs-speaking/`. Không chấp nhận URL ngoài hoặc đường dẫn `..`.
4. Audio khai báo `{"src":"assets/audio/example.mp3","script":"Nội dung chính xác"}`. `script` phải bằng `prompt` của câu hỏi hoặc `text` của từ/cụm/lượt hội thoại. Thiếu audio dùng `null`. Việc kiểm tra chuỗi không thay cho nghe và kiểm duyệt nội dung file thật.
5. Thêm topic vào `data/topics.json` với `{ "id": "topic-id", "file": "topic-id.json" }`, hoặc dùng nút **Nhập topic JSON**. Nhập trong UI lưu topic trên trình duyệt; media vẫn cần tồn tại trong ứng dụng. Không ghi đè topic ID đang có.
6. `answerId` liên kết tới câu đã xác nhận cho lượt trả lời của vai học sinh; app luôn gỡ audio mẫu khi thay bằng nội dung cá nhân, kể cả khi có file audio của mẫu.

`js/services.js` chỉ dành vị trí cho adapter STT / revision / TTS ở tương lai; cả ba là `null` và không gọi mạng. Khi tích hợp sau này phải có hợp đồng bảo vệ ý người học và xác nhận trước khi dùng kết quả.

## Kiểm thử

Node 20+; Chromium cho kiểm thử trình duyệt:

```sh
cd efs-speaking
npm ci --ignore-scripts
npm test
# Khởi động máy chủ tĩnh tại repository root trong terminal khác.
npm run test:browser
```

`CHROMIUM_PATH` mặc định `/usr/bin/chromium`; `EFS_TEST_URL` mặc định trỏ đến server cục bộ cổng 8000 và đường dẫn `/efs-speaking/`.

- Core: xác thực JSON/audio script; chỉ dùng câu xác nhận; cập nhật câu cá nhân; vai A/B và gỡ audio mẫu.
- Chromium headless, viewport 390×844: ảnh, transcript, sửa/xác nhận flashcard, vai A/B, ba cách luyện, lưu/xuất script, MediaRecorder với micro giả lập, phát lại âm thanh thật được tạo bởi MediaRecorder, lưu qua reload, xóa, quyền micro bị từ chối, import topic, nút audio fixture và không phát trên mặt trả lời cá nhân, kiểm tra tràn ngang ở cả sáu bước.
- Desktop 1440×1000: ảnh chụp kiểm tra bố cục.
- Ảnh chụp sinh trong `tests/artifacts/` (gitignore).
- Bộ kiểm thử EFS Grading được chạy để kiểm tra hồi quy. Git diff ngoài `efs-speaking/` phải trống.

Micro kiểm thử là thiết bị giả lập Chromium, không chứng minh phần cứng điện thoại hoạt động. Cần QA riêng trên Android Chrome và iPhone Safari: micro thật, tai nghe, đổi ứng dụng, khóa màn hình, tải file và giới hạn bộ nhớ. Không khẳng định đã kiểm thử thiết bị thật. Định dạng bản ghi tùy trình duyệt (WebM/MP4/Ogg); không cam kết ghi thẳng MP3/WAV. Bản ghi tự dừng sau 2 phút.

## Phạm vi Git

Nhánh `feat/efs-speaking-pilot-001-my-hobby` tạo từ `origin/main` tại `1d134092e106bf3029f21d29a86ad5d851fa7edd` (checkout ban đầu không có nhánh local `main`). Chỉ thêm file trong `efs-speaking/`; không sửa ứng dụng cũ, cấu hình deployment, việc commit/push nhánh demo được chủ repository cho phép riêng để tải ZIP; không merge, tạo Pull Request tự động hoặc deploy.

## Danh sách file bàn giao

| File | Vai trò |
| --- | --- |
| `index.html`, `css/style.css` | Khung giao diện sáu bước, responsive |
| `js/app.js` | Điều hướng, audio HTML5, form xác nhận, flashcards, vai A/B và MediaRecorder |
| `js/core.js` | Kiểm tra JSON, liên kết câu cá nhân và script |
| `js/storage.js` | localStorage và IndexedDB |
| `js/services.js` | Adapter tương lai chưa kích hoạt |
| `data/topics.json`, `data/my-hobby.json` | Danh mục và nội dung Topic 001 |
| `assets/hobbies.svg` | Minh họa tự tạo |
| `tests/core.test.js`, `tests/browser.cjs` | Kiểm thử logic và trình duyệt |
| `package.json`, `package-lock.json` | Lệnh chạy và dependency kiểm thử được khóa phiên bản |
| `.gitignore`, `README.md` | Bỏ qua output cục bộ và tài liệu bàn giao |

Kết quả lần chạy bàn giao: 3/3 kiểm thử core đạt; kịch bản Chromium mobile/desktop đạt; EFS Grading đạt 10 kiểm thử core và hai kịch bản UI hiện có. Không chạy lại reader/OCR vì không thay đổi phần đọc tài liệu. `git diff origin/main` ngoài `efs-speaking/` trống. Không thử thiết bị điện thoại thật.

## Tải demo từ GitHub về Windows

Mở nhánh `feat/efs-speaking-pilot-001-my-hobby` trên GitHub, chọn **Code → Download ZIP**. ZIP này chứa toàn bộ repository của nhánh, không chỉ thư mục Speaking. Giải nén, mở PowerShell tại thư mục gốc đã giải nén rồi chạy:

```powershell
py -m http.server 8000 --bind 127.0.0.1 --directory efs-speaking
```

Nếu không có `py` nhưng đã cài Python 3, dùng `python` thay thế. Truy cập `http://127.0.0.1:8000` trên chính máy Windows của bạn và giữ cửa sổ server mở. Không mở trực tiếp `index.html` bằng `file://`.
