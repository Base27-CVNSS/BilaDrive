# 💾 BilaDrive

> **Client lưu trữ phi tập trung, local-first trên Arweave — không tài khoản email, không máy chủ giữ khóa, không khóa chặt dữ liệu vào một giao diện duy nhất.**

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Arweave](https://img.shields.io/badge/Protocol-Arweave-black)](https://github.com/ArweaveTeam/arweave)
[![arweave-js](https://img.shields.io/badge/SDK-arweave--js%201.15.7-black)](https://github.com/ArweaveTeam/arweave-js)
[![GitHub Pages](https://img.shields.io/badge/UI-GitHub%20Pages-black)](https://pages.github.com/)

**BilaDrive** là một client lưu trữ phi tập trung được xây trên **Arweave**, do **Long Ngo** phát triển và phát hành theo giấy phép **MIT**. Dự án học từ cách ArDrive biến Arweave thành trải nghiệm “Drive / Folder / File”, nhưng chủ động thiết kế lại một số lớp để giảm phụ thuộc vào gateway, frontend, chỉ mục và nhà cung cấp duy nhất.

BilaDrive **không tạo blockchain mới**, **không phát hành token**, **không thay đổi giao thức Arweave**. Nó là lớp client chạy phía người dùng để:

- 🔑 kết nối ví và ký transaction;
- 📤 ghi dữ liệu lên Arweave;
- 🔐 mã hóa file riêng tư trước khi upload;
- 🧭 tự chuyển gateway khi gateway hiện tại lỗi;
- 🗂️ duy trì chỉ mục tệp local-first bằng IndexedDB;
- 📦 xuất/nhập chỉ mục di động để tránh phụ thuộc vào một website;
- 🔎 đồng bộ các transaction BilaDrive theo địa chỉ ví;
- 🌐 chạy như một static app trên GitHub Pages và có thể chuyển sang Permaweb sau này.

---

## 🧭 BilaDrive là gì?

Có thể hình dung BilaDrive theo công thức:

```text
BilaDrive
=
Wallet / Signer
+ Local-first File Index
+ Optional Client-side Encryption
+ Gateway Router / Failover
+ Arweave Transaction Layer
+ Portable Recovery Metadata
+ Static MS-DOS Web UI
```

Nó đứng **trên** Arweave giống như một trình quản lý tệp đứng trên một hệ thống lưu trữ bất biến.

```text
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│              Browser / GitHub Pages / Permaweb             │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   BilaDrive UI  │
                    │  MS-DOS B/W     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌────▼─────┐  ┌────▼─────────┐
        │ Wallet    │  │ BilaFS   │  │ Crypto Layer │
        │ ArConnect │  │ Local DB │  │ AES-256-GCM  │
        │ / JWK     │  │ Index    │  │ Web Crypto   │
        └─────┬─────┘  └────┬─────┘  └────┬─────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼─────────┐
                    │ Gateway Router   │
                    │ health + failover│
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   arweave.net          g8way.io           ar-io.dev
          └──────────────────┬──────────────────┘
                             ▼
                    ┌─────────────────┐
                    │    ARWEAVE      │
                    │ Permanent Data  │
                    └─────────────────┘
```

---

## 🧠 Bản chất của BilaDrive

### 1. Không phải “cloud drive Web3” theo nghĩa truyền thống

Google Drive, OneDrive hay Dropbox thường gom nhiều chức năng về một nhà cung cấp:

```text
Account
+ Access Control
+ Filesystem
+ Storage
+ Database
+ CDN
+ Billing
+ Recovery
        │
        ▼
  ONE PROVIDER
```

BilaDrive tách chúng thành các lớp:

```text
Wallet / signer      → identity + transaction authorization
Web Crypto           → privacy before upload
IndexedDB            → local working index
Portable JSON index  → recovery / migration
Gateway pool         → data access route
Arweave               → permanent data layer
Transaction ID        → content pointer
Static frontend       → replaceable interface
```

Frontend có thể thay, gateway có thể thay, local index có thể nhập lại; **TX ID mới là tham chiếu dữ liệu quan trọng**.

### 2. Không phải blockchain mới

BilaDrive không có consensus, miner, token hay ledger riêng. Mọi dữ liệu permanent thực tế nằm trên **Arweave**.

### 3. Không phải bản fork giao diện ArDrive

BilaDrive tham khảo tư duy từ ArDrive và hệ sinh thái Arweave, nhưng code MVP được tổ chức lại theo hướng **static, browser-first, local-first và gateway-agnostic**.

---

## 🧱 Nền tảng kỹ thuật

Dự án dựa trên các thành phần công khai của hệ sinh thái Arweave:

| Lớp | Công nghệ / dự án | Vai trò |
|---|---|---|
| Protocol | [`ArweaveTeam/arweave`](https://github.com/ArweaveTeam/arweave) | mạng lưu trữ permanent |
| Browser SDK | [`ArweaveTeam/arweave-js`](https://github.com/ArweaveTeam/arweave-js) | tạo, ký, post và đọc transaction |
| Ý tưởng Drive UX | [`ardriveapp/ardrive-web`](https://github.com/ardriveapp/ardrive-web) | tham khảo trải nghiệm quản lý file |
| Core concepts | [`ardriveapp/ardrive-core-js`](https://github.com/ardriveapp/ardrive-core-js) | tham khảo file management, upload, manifest, sync |
| Crypto | Web Crypto API | PBKDF2 + AES-GCM phía trình duyệt |
| Local database | IndexedDB | chỉ mục local-first |
| Hosting | GitHub Pages | frontend tĩnh, có thể thay thế |

> BilaDrive v0.1.0 dùng **arweave-js 1.15.7** ở frontend. Với batch/file lớn, Arweave JS chính thức khuyến nghị hướng bundle/ArBundles thay vì nhiều base-layer transaction trực tiếp; vì vậy MVP chủ động giới hạn direct upload và đưa Turbo/ANS-104 vào roadmap.

---

## ⚙️ Nguyên lý hoạt động

### A. PUBLIC upload

```text
File
 │
 ├─ đọc bytes trong browser
 │
 ├─ tạo Arweave transaction
 │
 ├─ gắn metadata tags
 │
 ├─ ký bằng ArConnect hoặc JWK
 │
 ├─ post qua gateway khỏe
 │
 ▼
Arweave
 │
 ▼
TX ID
 │
 ├─ lưu local index
 └─ export portable index
```

Metadata public có thể gồm:

```text
App-Name: BilaDrive
App-Version: 0.1.0
BilaDrive-Format: BilaFS/0.1
BilaDrive-File-Id: <UUID>
BilaDrive-Mode: public
BilaDrive-Original-Size: <bytes>
Content-Type: <mime>
File-Name: <filename>
```

PUBLIC phải được hiểu là **công khai và gần như không thể thu hồi sau khi đã được mạng xác nhận**.

---

### B. PRIVATE upload

Private mode **không gửi plaintext lên Arweave**.

```text
Original file
     │
     ▼
Password
     │
     ├── Random salt 128-bit
     │
     ▼
PBKDF2-SHA-256
310,000 iterations
     │
     ▼
AES-256 key
     │
     + Random IV 96-bit
     │
     ▼
AES-256-GCM
     │
     ▼
Ciphertext
     │
     ▼
Signed transaction
     │
     ▼
Arweave
```

BilaDrive không đưa `File-Name` plaintext của private file vào transaction. Transaction chỉ mang metadata kỹ thuật cần để giải mã, ví dụ:

```text
BilaDrive-Mode: private
Content-Type: application/octet-stream
BilaDrive-Cipher: AES-256-GCM
BilaDrive-KDF: PBKDF2-SHA-256
BilaDrive-KDF-Iterations: 310000
BilaDrive-Salt: <base64>
BilaDrive-IV: <base64>
BilaDrive-Name-Hash: <sha256>
```

`Salt` và `IV` **không phải secret**. Secret thực sự là mật khẩu/khóa dẫn xuất.

Sau upload, client tự tạo một file:

```text
<filename>.biladrive-recovery.json
```

Recovery bundle chứa:

- TX ID;
- File ID;
- tên file gốc;
- MIME;
- kích thước;
- salt / IV / KDF parameters;
- owner;
- thời điểm tạo.

**Recovery bundle không chứa mật khẩu.**

---

## 🔑 Quản lý ví

BilaDrive v0.1.0 hỗ trợ hai phương án.

### Khuyến nghị: ArConnect

```text
BilaDrive
   │
   ▼
ArConnect extension
   │
   ▼
SIGN_TRANSACTION
```

Private key không cần được BilaDrive đọc trực tiếp.

### Fallback: nạp JWK

```text
JWK file
   │
   ▼
Browser RAM only
   │
   ▼
Sign transaction
   │
   ▼
Disconnect / close tab
   │
   ▼
Reference removed
```

BilaDrive **không chủ động ghi JWK vào IndexedDB hoặc localStorage**.

> ⚠️ JavaScript frontend vẫn không phải ví cứng. Với dữ liệu quan trọng, nên dùng một ví upload riêng và giữ key offline.

---

## 🌐 Gateway Router — khắc phục single-gateway dependency

Một hạn chế phổ biến khi làm ứng dụng Arweave là code cứng:

```text
https://arweave.net/<TX_ID>
```

Nếu gateway đó chậm hoặc lỗi, người dùng dễ hiểu nhầm “dữ liệu đã mất”.

BilaDrive dùng pool:

```text
Gateway A ─┐
Gateway B ─┼── health check ──> chọn gateway phản hồi tốt
Gateway C ─┘
```

Nếu một request thất bại:

```text
TX_ID
 │
 ├─ Gateway A  X
 ├─ Gateway B  X
 └─ Gateway C  ✓
```

MVP hiện cấu hình:

```text
https://arweave.net
https://g8way.io
https://ar-io.dev
```

Pool có thể mở rộng thành gateway discovery / Wayfinder trong roadmap.

---

## 🗂️ BilaFS — chỉ mục local-first

BilaDrive v0.1.0 **không tuyên bố là một implementation ArFS hoàn chỉnh**. Thay vào đó, MVP dùng một lớp chỉ mục nhẹ gọi là **BilaFS/0.1**.

```text
IndexedDB
   │
   ├── TX ID
   ├── File ID
   ├── Name
   ├── MIME
   ├── Mode
   ├── Crypto metadata
   ├── Owner
   ├── Upload gateway
   └── Created time
```

Điểm quan trọng là local database **không phải nguồn sự thật duy nhất**.

Người dùng có thể:

```text
Local Index
   │
   ├── Export JSON
   │       │
   │       └── backup USB / Arweave / IPFS / another machine
   │
   └── Import JSON
```

Vì vậy một website BilaDrive bị mất không đồng nghĩa file và metadata khôi phục cũng mất theo.

---

## 🔄 Đồng bộ lại từ Arweave

BilaDrive truy vấn GraphQL theo:

```text
owner = current wallet address
App-Name = BilaDrive
```

Sau đó dựng lại local index từ tags.

```text
Arweave
  │
  ▼
GraphQL
  │
  ▼
BilaDrive transactions owned by wallet
  │
  ▼
IndexedDB
```

PUBLIC file có thể phục hồi tên từ `File-Name`.

PRIVATE file cố ý không công khai tên thật. Vì vậy nếu chỉ sync từ network mà không có portable index/recovery bundle, UI chỉ có thể hiển thị dạng:

```text
[PRIVATE-ab12cd34]
```

Đây là đánh đổi chủ đích giữa **privacy** và **khả năng tái dựng metadata thân thiện**.

---

## 🧰 Những hạn chế BilaDrive muốn xử lý

| Vấn đề thường gặp | Hướng BilaDrive |
|---|---|
| Phụ thuộc một gateway | gateway health check + failover |
| Phụ thuộc frontend | static app thay thế được; TX ID độc lập UI |
| Chỉ mục nằm trong một app | export/import portable index |
| Private key đi qua backend | browser-only; ArConnect ưu tiên; JWK RAM-only |
| Metadata private bị lộ | không ghi filename/MIME gốc thành public tag |
| Public upload nhầm rất khó cứu | cảnh báo + confirm trước khi ký/post |
| Local database bị xóa | network sync + portable index |
| Link gắn chết với hostname | lưu TX ID, dựng gateway URL lúc truy cập |
| Large batch kém hiệu quả | roadmap Turbo / ANS-104 / bundle |
| GitHub/Vercel bị mất | roadmap publish chính BilaDrive lên Permaweb Manifest |

---

## 🆚 BilaDrive và ArDrive

BilaDrive **không đặt mục tiêu “thay thế ArDrive”**. ArDrive là sản phẩm hoàn thiện hơn với ArFS, desktop/mobile/web và hệ sinh thái upload riêng. BilaDrive nhắm đến một client nghiên cứu/minimal có thể audit dễ hơn và thử nghiệm các nguyên tắc:

| Tiêu chí | ArDrive | BilaDrive v0.1 |
|---|---|---|
| Nền tảng | Arweave | Arweave |
| Filesystem | ArFS | BilaFS lightweight index |
| Web UI | Flutter app | HTML/CSS/JS tĩnh |
| Private storage | Có | Có, AES-256-GCM MVP |
| Gateway tùy chỉnh | Có | Gateway pool + auto failover |
| Portable local index | Theo hệ ArFS/app | JSON explicit export/import |
| JWK handling | hệ wallet/app | ArConnect preferred, RAM-only fallback |
| Offline frontend | Có thể build app | static source dễ mirror |
| Large upload | Core/Turbo ecosystem | roadmap |
| Permaweb manifest | Có hỗ trợ | roadmap |

---

## 🖥️ Giao diện

BilaDrive dùng phong cách **MS-DOS trắng/đen**, ưu tiên thông tin hơn trang trí:

```text
C:\BILADRIVE> PERMANENT_STORAGE.EXE
──────────────────────────────────────────────────────────────
NET: ONLINE     GW: arweave.net     WALLET: ...    INDEX: 12

[F1] CONNECT  [F2] JWK  [F5] SYNC  [F6] GATEWAY  [F7] EXPORT

[ UPLOAD / GHI DỮ LIỆU LÊN ARWEAVE ]
FILE: thesis.pdf     MODE: PRIVATE      [ESTIMATE] [UPLOAD]

[ FILE EXPLORER ]
NAME        TYPE          SIZE     MODE      TX ID             ACTION
thesis.pdf application... 2.4 MB   PRIVATE   Abc...xyz         DOWNLOAD
```

Không dùng gradient, glassmorphism hoặc component nặng. Mục tiêu là một **file console chuyên nghiệp, dễ đọc, dễ fork và dễ chạy lâu dài**.

---

## 🚀 Chạy cục bộ

Do đây là static app, có thể dùng bất kỳ HTTP server nào.

### Python

```bash
python -m http.server 8080
```

Sau đó mở:

```text
http://localhost:8080
```

### Node.js

```bash
npx serve .
```

> Không nên mở trực tiếp bằng `file://` vì extension wallet, CORS và Web Crypto có thể hoạt động khác tùy trình duyệt.

---

## 🌍 GitHub Pages

Repository đã có workflow:

```text
.github/workflows/pages.yml
```

Workflow build theo mô hình static artifact:

```text
main
 │
 ▼
actions/checkout
 │
 ▼
actions/upload-pages-artifact
 │
 ▼
actions/deploy-pages
```

Nếu Pages chưa được bật cho repository, vào:

```text
Settings → Pages → Build and deployment → Source: GitHub Actions
```

Sau đó push vào `main` sẽ kích hoạt deploy.

---

## 📁 Cấu trúc repository

```text
BilaDrive/
├── index.html                 # MS-DOS storage UI
├── styles.css                 # giao diện trắng/đen responsive
├── app.js                     # wallet, crypto, gateway, upload, index
├── README.md                  # tài liệu kiến trúc tiếng Việt
├── SECURITY.md                # mô hình an toàn và cảnh báo
├── LICENSE                    # MIT
├── .nojekyll                  # static Pages
└── .github/
    └── workflows/
        └── pages.yml          # GitHub Pages deployment
```

---

## 🏷️ Data model MVP

Ví dụ một record local:

```json
{
  "indexVersion": 1,
  "txId": "ARWEAVE_TRANSACTION_ID",
  "fileId": "uuid",
  "name": "dataset.csv",
  "mime": "text/csv",
  "size": 123456,
  "originalSize": 123456,
  "mode": "public",
  "owner": "ARWEAVE_ADDRESS",
  "gatewayAtUpload": "https://arweave.net",
  "createdAt": "2026-08-21T00:00:00.000Z",
  "status": "SUBMITTED"
}
```

Private record bổ sung:

```json
{
  "crypto": {
    "alg": "AES-256-GCM",
    "kdf": "PBKDF2-SHA-256",
    "iterations": 310000,
    "salt": "...",
    "iv": "..."
  }
}
```

---

## 🛡️ Mô hình an toàn

### BilaDrive bảo vệ gì?

- mã hóa plaintext trước upload ở Private mode;
- không có backend ứng dụng để nhận JWK;
- JWK fallback không được persist bởi BilaDrive;
- password không đưa vào transaction/index/recovery bundle;
- private filename không public;
- gateway có failover;
- portable metadata giúp phục hồi khi frontend/local DB mất.

### BilaDrive không thể bảo vệ gì?

- máy đã nhiễm malware/keylogger;
- extension trình duyệt độc hại;
- người dùng tự đăng JWK/seed lên mạng;
- phishing;
- password quá yếu;
- upload PUBLIC nhầm;
- lỗi cryptographic implementation chưa được audit;
- thay đổi/rủi ro ở dependency frontend.

Đọc thêm: [SECURITY.md](SECURITY.md).

---

## ⚠️ Trạng thái hiện tại

**v0.1.0 là MVP nghiên cứu/prototype, chưa phải sản phẩm production.**

Các giới hạn chủ động:

1. Direct upload tối đa **25 MiB** trong UI MVP.
2. Chưa tích hợp Turbo upload / ANS-104 bundle.
3. Chưa có folder tree/version graph đầy đủ như ArFS.
4. Chưa có multi-device CRDT conflict resolution.
5. Chưa có hardware wallet workflow chuyên biệt.
6. Chưa có encrypted metadata transaction riêng cho private folders.
7. SDK frontend hiện được pin ở phiên bản cụ thể nhưng vẫn tải qua CDN; production hardening nên vendor bundle và kiểm tra hash/SRI.
8. Chưa được audit bảo mật độc lập.

---

## 🗺️ Roadmap

### v0.2 — Permanent Upload Layer

- [ ] Turbo / ANS-104 uploader
- [ ] resumable/chunked upload
- [ ] upload queue
- [ ] checksum SHA-256 trước/sau upload
- [ ] transaction confirmation monitor

### v0.3 — BilaFS

- [ ] Drive / Folder / File entities
- [ ] append-only metadata revisions
- [ ] version graph
- [ ] encrypted private folder metadata
- [ ] deterministic conflict resolution

### v0.4 — Gateway Mesh

- [ ] Wayfinder-style distributed routing
- [ ] custom gateway registry
- [ ] latency + availability scoring
- [ ] content verification
- [ ] self-hosted gateway profile

### v0.5 — Recovery

- [ ] encrypted portable index
- [ ] multi-device sync
- [ ] Shamir recovery option cho metadata key
- [ ] QR recovery bundle
- [ ] watch-only index mode

### v1.0 — Permanent BilaDrive

- [ ] publish frontend lên Arweave Manifest
- [ ] ArNS address
- [ ] GitHub Pages chỉ còn mirror
- [ ] reproducible build
- [ ] vendored + integrity-verified dependencies
- [ ] security review/audit

---

## 🔬 Định hướng kiến trúc dài hạn

Mục tiêu cuối không phải:

```text
GitHub Pages → arweave.net → file
```

mà là:

```text
                     ┌── GitHub Pages mirror
                     │
Human name / ArNS ───┼── Permaweb BilaDrive UI
                     │
                     └── Local/offline build
                              │
                     Gateway Router / Wayfinder
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
           Gateway A       Gateway B       Gateway C
              └───────────────┬───────────────┘
                              ▼
                           Arweave
                              │
                   ┌──────────┼──────────┐
                   ▼          ▼          ▼
                 Files      BilaFS     Manifest
```

Tức là **website, domain, gateway và local index đều có thể thay thế; dữ liệu và ID gốc không khóa vào một nhà cung cấp duy nhất**.

---

## 📚 Tài liệu tham khảo

- [Arweave Protocol](https://github.com/ArweaveTeam/arweave)
- [Arweave JS](https://github.com/ArweaveTeam/arweave-js)
- [Arweave Standards](https://github.com/ArweaveTeam/arweave-standards)
- [ArDrive Web](https://github.com/ardriveapp/ardrive-web)
- [ArDrive Core JS](https://github.com/ardriveapp/ardrive-core-js)
- [AR.IO Documentation](https://docs.arweave.net/)

---

## 📜 License

BilaDrive được phát hành theo giấy phép **MIT**.

```text
Copyright (c) 2026 Long Ngo
```

Xem [LICENSE](LICENSE).

---

## 👨‍💻 Tác giả

**Long Ngo**  
Developer / Maintainer — BilaDrive

> **BilaDrive — Own the pointer. Control the key. Replace the interface. Keep the data.**
