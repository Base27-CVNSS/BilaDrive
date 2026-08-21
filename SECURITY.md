# 🔐 Security Policy — BilaDrive

BilaDrive là client phía trình duyệt. Thiết kế v0.1.0 ưu tiên giảm bề mặt rò rỉ khóa, nhưng **không phải ví cứng và chưa qua kiểm toán bảo mật độc lập**.

## Nguyên tắc

- Ưu tiên **ArConnect** để khóa riêng không đi vào mã nguồn BilaDrive.
- Nếu nạp **JWK**, BilaDrive chỉ giữ object khóa trong RAM của tab hiện tại; không ghi JWK vào IndexedDB, localStorage hay remote server.
- Private mode dùng **PBKDF2-SHA-256 → AES-256-GCM** trong Web Crypto API.
- Password mã hóa không được ghi vào transaction, portable index hay recovery bundle.
- Tên file Private không được đưa vào tag `File-Name`; chỉ hash tên được dùng để đối chiếu cục bộ.

## Rủi ro phải hiểu

1. JavaScript chạy trong trình duyệt vẫn phụ thuộc an toàn của trình duyệt, extension và chuỗi cung ứng frontend.
2. PUBLIC upload lên Arweave phải được xem là gần như không thể thu hồi.
3. Mất password Private + recovery metadata có thể khiến dữ liệu không thể giải mã.
4. Người có JWK có toàn quyền ký transaction từ ví đó.
5. v0.1.0 chưa phải bản production cho dữ liệu tuyệt mật hoặc tài sản giá trị cao.

## Khuyến nghị

- Dùng một ví riêng chỉ dành cho upload dữ liệu.
- Không dùng ví đang giữ lượng AR lớn để thử nghiệm.
- Sao lưu JWK/seed ngoại tuyến, tách khỏi máy đang duyệt web.
- Xuất `BilaDrive Portable Index` định kỳ và lưu ít nhất 2 bản độc lập.
- Với Private mode, sao lưu recovery bundle và password ở hai kênh khác nhau.

## Báo cáo lỗ hổng

Hãy mở GitHub Issue với mô tả tái hiện, nhưng **không đăng JWK, seed phrase, mật khẩu, private recovery data hoặc dữ liệu nhạy cảm**.
