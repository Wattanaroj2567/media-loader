# รายการตัวแปรสภาพแวดล้อม (Environment Variables Specification)

[English](ENVIRONMENT_VARIABLES.md) | ภาษาไทย

ใช้ `.env.example` สำหรับไฟล์แม่แบบตัวอย่างเท่านั้น

ใช้ `.env.local` สำหรับการกำหนดค่าความลับในเครื่อง Local จริง

ห้าม commit ข้อมูลความลับจริงลงใน Git Repository โดยเด็ดขาด

---

## 1. ตัวแปรฝั่ง Frontend (Frontend Variables)

ใช้งานโดยโค้ด Next.js ฝั่ง Client:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FASTAPI_BASE_URL=
```

ค่าเหล่านี้เป็นค่าคอนฟิกสาธารณะที่เปิดเผยบนเบราว์เซอร์ได้ **ห้าม** ใส่ความลับส่วนตัวลงในตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_`

---

## 2. ตัวแปรฝั่ง Backend (Backend API Variables)

ใช้งานเฉพาะภายในบริการ FastAPI เท่านั้น:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=
CORS_ORIGINS=
```

---

## 3. ตัวแปรฝั่ง Media Worker (Worker Variables)

ใช้งานเฉพาะภายในบริการ Python Media Worker เท่านั้น:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MEDIA_STORAGE_BUCKET=media-downloads
WORKER_SECRET=
WORKER_ID=local-worker-1
WORKER_POOL=local
NODE_PATH=
DENO_PATH=
FFMPEG_PATH=
MAX_FILE_SIZE_MB=500
TEMP_DIR=tmp/media-loader
```

ทั้ง API และ worker จะ resolve `TEMP_DIR` จาก root ของโปรเจกต์เดียวกัน
ต้องกำหนดค่าเดียวกันเสมอ โดย Docker จะแชร์ผ่าน `/app/tmp`

`WORKER_POOL` แยกคิวตาม runtime เพื่อไม่ให้ worker บน Cloud (Oracle Cloud / VPS) แย่งงานจาก
เครื่อง local ที่เก็บไฟล์คนละ filesystem ใช้ `local` บนเครื่องพัฒนา และ
`cloud` บน Cloud/OCI (ระบบตรวจจับและแยกคิวให้ปลอดภัยเสมอ)

`NODE_PATH`, `DENO_PATH` และ `FFMPEG_PATH` เป็นตัวเลือกเสริม โดย worker จะเลือก
Deno ก่อน จากนั้นจึงค้นหา Node จาก `PATH` และใช้ FFmpeg binary ที่จัดการอยู่ใน
Python environment โดยอัตโนมัติ ส่วน deployment image มี Deno และ dependency
แบบล็อกเวอร์ชันสำหรับ JavaScript solver ของ YouTube ใน yt-dlp แล้ว

---

## 4. ตัวแปรตัวเลือกเสริม (Optional Variables)

```env
LOG_LEVEL=info
```
