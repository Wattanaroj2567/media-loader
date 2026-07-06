# Media Loader Product Rebuild Design

## เป้าหมาย

ปรับ Media Loader จากหน้าตัวอย่างที่มี flow ไม่ครบ ให้เป็นเครื่องมือส่วนตัวที่ใช้งานได้จริงตั้งแต่ Google Auth, วิเคราะห์ URL, เลือก format ที่มีอยู่จริง, จัดคิว, ยกเลิกงาน, บันทึกไฟล์ลงเครื่อง, ดูประวัติ และลบบัญชี โดยไม่ข้าม policy check และไม่เก็บไฟล์สื่อถาวรใน Supabase

## สิ่งที่พบจากระบบเดิม

- UI ปัจจุบันเป็นโทนสว่างแบบ warm/earthy ซึ่งขัดกับแนวทาง dark command center ใน `AGENTS.md`
- หน้า `Downloads` ทำหน้าที่ปนกันระหว่างคิว ประวัติ และการจัดการไฟล์ ส่วน `/history` เป็นเพียง redirect
- สิทธิ์ในการประมวลผลถูกยืนยันอัตโนมัติจาก frontend ทั้งที่ UI ไม่มีช่องให้ผู้ใช้ยืนยัน
- FastAPI ไม่ตรวจ access token และมี fallback ไปใช้ profile แรก ทำให้ข้อมูลผู้ใช้อาจปะปนกัน
- การ list/get/download file ไม่กรองด้วย `user_id`
- API client และ API schema ใช้ชื่อ field ไม่ตรงกันบางส่วน
- yt-dlp ถูกตั้งให้ข้าม DASH/HLS บางส่วน จึงอาจทำให้ความละเอียดจริงหาย และ format ที่ส่งกลับยังซ้ำ/อ่านยาก
- metadata ขาดชื่อเจ้าของสื่อ ความสูง FPS bitrate และ label ที่พร้อมแสดงผล
- ยังไม่มี endpoint ที่ทำงานจริงสำหรับ cancel job, delete job และ delete account
- worker ไม่มี cooperative cancellation และ progress ที่เชื่อถือได้
- ปุ่มลบเดิมลบเฉพาะไฟล์ชั่วคราว ไม่ได้ลบรายการคิวหรือประวัติ

## ทางเลือกที่พิจารณา

### 1. รื้อเฉพาะ UI

เร็วที่สุด แต่ยังคง format ปลอม/ซ้ำ, ไม่มีการแยกผู้ใช้ และไม่มี cancel/delete ที่ทำงานจริง จึงไม่ตอบ FR

### 2. Secure vertical slice — เลือกใช้

แก้ contract ตั้งแต่ Supabase session → FastAPI → queue → worker → file delivery แล้วสร้าง UI ใหม่บน contract เดียวกัน ใช้เวลามากกว่าแต่ได้ flow ที่ใช้งานจริงและทดสอบได้

### 3. ย้าย queue/history ไป local-only ทั้งหมด

ลดการใช้ Supabase แต่ขัดกับสถาปัตยกรรมเดิม, ทำให้ Google Auth/RLS ไม่มีประโยชน์ และใช้งานข้าม browser session ยาก

## Information Architecture

Navigation ใหม่มี 4 ส่วนที่หน้าที่ไม่ซ้ำกัน:

1. `โหลดใหม่` (`/dashboard`) — วิเคราะห์ URL, ดู metadata, เลือก video/audio format และเพิ่มคิว
2. `คิวงาน` (`/downloads`) — แสดงเฉพาะงานที่กำลังรอหรือประมวลผล พร้อมยกเลิกหรือลบงานที่ยังไม่เริ่ม
3. `ประวัติ` (`/history`) — แสดงงานสถานะปลายทาง `COMPLETED`, `FAILED`, `BLOCKED`, `CANCELLED` พร้อมค้นหา ดาวน์โหลดไฟล์ที่ยังพร้อม และลบประวัติ
4. `บัญชี` (`/settings`) — ข้อมูล Google account, ออกจากระบบ และ Danger Zone สำหรับลบบัญชี

Desktop ใช้ sidebar คงที่เพื่อให้พื้นที่ทำงานอ่านง่าย ส่วน mobile ใช้ top identity bar และ bottom navigation ที่มี touch target อย่างน้อย 44px

## UX ของการวิเคราะห์

หน้าโหลดใหม่เริ่มด้วย URL composer ที่เด่นเพียงจุดเดียว ระบบตรวจ URL และ policy ก่อนอ่าน metadata/format จริง จากนั้นผู้ใช้ตรวจรายละเอียด เลือก format และยืนยันสิทธิ์ก่อนเพิ่มงานเข้าคิว:

```text
URL validation → policy check → metadata extraction → format normalization → rights confirmation → queue
```

ผลวิเคราะห์เป็นการ์ดแนวนอน:

- ซ้าย: thumbnail อัตราส่วน 16:9
- ขวา: ชื่อคลิป, ชื่อเจ้าของ/uploader, ระยะเวลา, platform และ source domain
- ด้านล่าง: tab `วิดีโอ` / `เสียง`, ตัวเลือกคุณภาพจริง และปุ่ม `เพิ่มเข้าคิว`

Video options ถูก deduplicate ด้วย `(height, fps)` และเลือก source format ที่เหมาะกับ MP4 มากที่สุดในแต่ละคู่ UI แสดงเฉพาะค่าที่ extractor ส่งกลับจริง เช่น `144p`, `240p`, `360p`, `480p`, `720p`, `1080p`, `1440p`, `2160p` หรือความสูงอื่นอย่าง `2460p` เมื่อแหล่งนั้นมีจริง ไม่มีการสร้าง resolution สมมติ

Audio options ถูก deduplicate จาก bitrate/codec จริง และแสดง bitrate ที่ extractor รายงาน เมื่อเลือกเสียง output จะเป็น MP3; เมื่อเลือกวิดีโอ output จะเป็น MP4

## Authentication และ Data Ownership

- Next.js รับ session ผ่าน Supabase Google Auth เหมือนเดิม
- API client แนบ `Authorization: Bearer <access_token>` ทุก request ที่เป็นข้อมูลผู้ใช้
- FastAPI ตรวจ token ผ่าน Supabase Auth และคืน `401` เมื่อ session ไม่ถูกต้อง
- service role อยู่เฉพาะ API/worker และทุก query ต้องกรองด้วย `user_id` ที่ได้จาก token
- ยกเลิก fallback profile แรกทั้งหมด
- policy log ผูกกับผู้ใช้ที่กำลังใช้งาน

## Queue และ Worker

สถานะใช้ชุดเดียวตาม `AGENTS.md`:

```text
PENDING → ANALYZING → READY → QUEUED → DOWNLOADING → CONVERTING → COMPLETED
```

เส้นทางพิเศษ:

```text
QUEUED → CANCELLED
DOWNLOADING/CONVERTING → CANCELLED
ANY_PROCESSING_STATUS → FAILED
POLICY_REJECTED → BLOCKED
```

- Worker เลือกงานเก่าสุดก่อน (FIFO)
- งาน `QUEUED` ลบได้ทันที
- งานที่เริ่มแล้วใช้ cancel endpoint เปลี่ยนเป็น `CANCELLED`
- yt-dlp progress hook ตรวจสถานะยกเลิกและอัปเดต progress แบบ throttle
- conversion ตรวจสถานะยกเลิกระหว่างรอ process
- worker ไม่เปลี่ยนงานที่ยกเลิกกลับเป็น `FAILED` หรือ `COMPLETED`

## Data Lifecycle

Supabase PostgreSQL เก็บเฉพาะ metadata ที่จำเป็นต่อคิว ประวัติ และ policy audit เช่น title, uploader, platform, quality, status, timestamps และ path ชั่วคราว ไม่เก็บ binary media ใน DB

ค่าเริ่มต้นใช้ local temp volume:

```text
worker → tmp/{job_id}/output → FastAPI authenticated stream → browser save picker
```

- Supabase Storage ไม่ถูกใช้ใน default flow
- Browser ใช้ File System Access API เพื่อเปิดหน้าต่างเลือกชื่อ/ตำแหน่งไฟล์เมื่อรองรับ และ fallback เป็น browser download
- หลัง FastAPI ส่ง response สำเร็จ ไฟล์ local temp ถูกลบและ `storage_path` ถูกล้าง แต่ metadata history ยังคงอยู่
- ไฟล์ที่ผู้ใช้ยังไม่รับถูก cleanup ตาม retention policy
- การลบ history ลบทั้ง row และไฟล์ชั่วคราวที่ยังเหลือ

## Account Deletion

หน้า Account มี confirmation dialog ที่ต้องพิมพ์ `DELETE` ก่อนดำเนินการ API จะ:

1. ตรวจ session
2. ยกเลิกงานที่ยัง active
3. ลบ local temp files ของผู้ใช้ภายใน temp root ที่ตรวจสอบ path แล้ว
4. ลบ Supabase Auth user ด้วย admin API
5. อาศัย `ON DELETE CASCADE` ลบ profile, jobs, formats, logs และ settings
6. frontend sign out และกลับหน้า login

## Visual System

- Background: neutral near-black
- Surfaces: charcoal ที่แยกชั้นด้วย border บาง
- Primary accent: restrained blue/cyan
- Success: green, warning: amber, destructive: red
- Typography: Kanit สำหรับภาษาไทย, Inter สำหรับ Latin, Geist Mono เฉพาะตัวเลข/technical metadata
- Radius ปานกลาง, ไม่มี pastel-heavy card, ไม่มี purple futuristic gradient, ไม่มี emoji
- Motion 150–250ms และเคารพ `prefers-reduced-motion`
- รองรับ 375px, 768px, 1024px และ 1440px

## Error Handling

- analysis error ต้องแยก `blocked`, `unsupported`, `server unavailable` และ `authentication expired`
- ห้ามคืน metadata ปลอมอย่าง `Extraction Failed` ใน success response
- destructive action มี confirmation และ disabled/loading state
- queue polling แสดง connection error ที่เห็นได้ ไม่ swallow error เงียบ
- file unavailable ใน history แสดงว่าไฟล์ชั่วคราวถูกนำออกแล้ว โดยไม่ทำให้ history หาย

## Verification

- Python unit/API tests: normalization, auth scoping, create/cancel/delete lifecycle, file path safety และ worker selector/cancellation
- TypeScript tests: format grouping/labeling, job status grouping และ save filename parsing
- Frontend lint + production build
- Browser verification: login shell, analysis states, queue/history/account layouts ที่ 375px และ desktop
- Manual Docker verification: `api`, `worker`, policy flow และ local file delivery โดยใช้ public-domain URL
