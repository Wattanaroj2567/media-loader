# คู่มือการ Deploy บน Cloudflare และตั้งค่า R2

> **ภาษา:** [English](../en/CLOUDFLARE_DEPLOYMENT_GUIDE.md) · **ภาษาไทย**

คู่มือนี้อธิบายการตั้งค่า Media Loader บน Cloudflare ระดับ 1:

1. **Frontend (`apps/web`) บน Cloudflare Workers** ด้วย `vinext` และ `@cloudflare/vite-plugin`
2. **ส่งไฟล์ผลลัพธ์ตรงผ่าน Cloudflare R2** (`MEDIA_OUTPUT_MODE=r2`) โดยคง `apps/api`, `apps/worker` และ `apps/proxy` บน Docker Compose และคง **Supabase** ไว้สำหรับ Auth และ PostgreSQL

---

## ภาพรวมสถาปัตยกรรม

```text
Browser
  ├─▶ Cloudflare Workers (apps/web ผ่าน vinext)
  ├─▶ Cloudflare Tunnel → Docker FastAPI (apps/api) → Supabase
  │                         └─ ออก R2 presigned URL อายุสั้นหลังตรวจสิทธิ์
  └─◀ โหลดตรง (ฟรี egress) ── Cloudflare R2 (private bucket)
                                  ▲
                                  │ อัปโหลดและลบไฟล์หมดอายุ
                            Docker Worker (apps/worker)
```

การใช้ R2 แทนการ stream ไฟล์ผ่าน Tunnel และเว็บเซิร์ฟเวอร์ช่วยให้ดาวน์โหลดเร็วขึ้น ไม่กิน bandwidth ขาออก และสอดคล้องกับข้อกำหนดการใช้งานของ Cloudflare Tunnel

---

## ส่วนที่ 1: ตั้งค่า Cloudflare R2 (ส่งไฟล์ตรง)

### 1. สร้าง Private R2 Bucket

1. เข้า **Cloudflare Dashboard → R2 Object Storage → Create bucket**
2. ตั้งชื่อ bucket (เช่น `media-downloads`)
3. ปิด Public Access ไว้ — Media Loader จะตรวจสิทธิ์เจ้าของงานผ่าน FastAPI แล้วออก presigned URL อายุสั้นให้เท่านั้น

### 2. ตั้งค่า CORS ของ Bucket

ที่ **Bucket Settings → CORS Policy** ให้เพิ่มสิทธิ์ `GET` และ `HEAD` เพื่อให้ `showSaveFilePicker` และการดาวน์โหลดแบบ Range บนมือถือทำงานตรงกับ R2 ได้:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-web-domain.workers.dev"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "Content-Type"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Content-Disposition", "Accept-Ranges"],
    "MaxAgeSeconds": 3600
  }
]
```

เปลี่ยน `https://your-web-domain.workers.dev` เป็น origin จริงของหน้าเว็บที่ deploy

### 3. ตั้งค่า Lifecycle Rule (ตาข่ายนิรภัยลบไฟล์เก่า)

ที่ **Bucket Settings → Object lifecycle rules** เพิ่มกฎลบไฟล์ภายใต้ prefix `jobs/` หลังครบ **1 วัน** ควบคู่กับระบบลบอัตโนมัติของ Worker ตามค่า `TEMP_FILE_RETENTION_MINUTES` (ค่าเริ่มต้น `60` นาที)

### 4. สร้าง R2 API Token

1. ไปที่ **R2 Object Storage → Manage R2 API Tokens → Create API Token**
2. เลือกสิทธิ์ **Object Read & Write** เฉพาะ bucket `media-downloads`
3. นำ **Account ID**, **Access Key ID** และ **Secret Access Key** ไปใส่ใน `.env.local` ของฝั่ง Backend เท่านั้น (ห้ามใส่ในตัวแปร Frontend):

```env
MEDIA_OUTPUT_MODE=r2
MEDIA_STORAGE_BUCKET=media-downloads
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_PRESIGNED_URL_TTL_SECONDS=300
```

4. รีสตาร์ต Docker stack เพื่อให้ทั้ง `api` และ `worker` โหลดค่าใหม่:

```bash
docker compose up -d --build api worker
```

---

## ส่วนที่ 2: Deploy `apps/web` ขึ้น Cloudflare Workers

### Build และ Deploy

รันจากโฟลเดอร์หลักของโปรเจกต์:

```bash
# Build bundle สำหรับ Cloudflare Workers (apps/web/dist)
pnpm build:web:cf

# Deploy ขึ้น Cloudflare Workers (ต้องล็อกอิน Cloudflare CLI / Wrangler ก่อน)
pnpm deploy:web:cf
```

### ตัวแปรสภาพแวดล้อมบน Cloudflare Workers

ตั้งค่าตัวแปรสาธารณะสำหรับ build ที่ **Workers & Pages → `media-loader` →
Settings → Build → Build Variables and Secrets** หรือส่งค่าให้ขั้น build ใน CI
Vinext ฝังค่า `NEXT_PUBLIC_*` ตอน build เมื่อแก้ค่าแล้วให้ build และ deploy ใหม่

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
NEXT_PUBLIC_FASTAPI_BASE_URL=https://api.yourdomain.com
```

ห้ามใส่ `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MEDIA_URL_ENCRYPTION_KEY` หรือ `DATABASE_URL` ในตัวแปรของ Cloudflare Workers

### รายการตรวจเช็กหลัง Deploy

1. **Supabase Auth:** เพิ่ม origin ของ Workers ใน **Site URL** และ **Redirect URLs**:
   - `https://your-web-domain.workers.dev/auth/callback`
   - `https://your-web-domain.workers.dev/auth/callback?next=/auth/reset-password`
2. **Backend CORS:** เพิ่ม origin ของ Workers ใน `CORS_ORIGINS` ของ
   `.env.local` ฝั่ง Backend โดยเก็บ origin เดิมไว้ แล้วรัน
   `docker compose up -d --force-recreate api worker` เพื่อโหลดค่าที่แก้ไข
3. **R2 CORS:** ตรวจสอบว่าใส่ origin ของ Workers ใน CORS policy ของ R2 bucket แล้ว
4. **ทดสอบ End-to-End:** เข้าสู่ระบบ วิเคราะห์ลิงก์ที่ได้รับอนุญาต สร้างงาน ตรวจสอบสถานะ `UPLOADING → COMPLETED` และตรวจสอบว่าเบราว์เซอร์ดาวน์โหลดตรงจาก `*.r2.cloudflarestorage.com`
