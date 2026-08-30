# คู่มือการติดตั้งสภาพแวดล้อมระบบ (User Setup Guide)

[English](USER_SETUP_GUIDE.md) | ภาษาไทย

คู่มือการตั้งค่าสภาพแวดล้อมสำหรับการใช้งาน Media Loader บนเครื่องของคุณ

โปรดทำตามขั้นตอนเหล่านี้เพียงครั้งเดียว และเขียนรหัสผ่านความลับลงในไฟล์ `.env.local` ด้วยตัวเอง — ห้ามบันทึกรหัสผ่านลับลงใน Log หรือ Git Repository โดยเด็ดขาด

---

## ขั้นตอนที่ 1 — สร้างโปรเจกต์ Supabase

1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard)
2. สร้างโปรเจกต์ใหม่ชื่อ `media-loader`
3. บันทึกรหัสผ่านฐานข้อมูล (Database Password) ไว้ในที่ปลอดภัย
4. รอตรากฎประมวลผลโปรเจกต์ให้เสร็จสมบูรณ์

คัดลอกข้อมูลความลับต่อไปนี้จาก Supabase Project Settings เพื่อนำมาใช้งาน:

```text
Project URL
Anon public key
Service role key
Database connection string
```

---

## ขั้นตอนที่ 2 — ใส่ค่าแปรสภาพแวดล้อมในเครื่อง Local

1. คัดลอกแม่แบบไฟล์ Environment:
   ```bash
   cp .env.example .env.local
   ```

2. เปิดไฟล์ `.env.local` แล้วใส่ค่าแปรสภาพแวดล้อมที่คัดลอกมา:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```

3. ตรวจสอบความถูกต้องของค่าแปรสภาพแวดล้อมโดยไม่แสดงรหัสลับ:
   ```bash
   pnpm check-env
   ```

---

## ขั้นตอนที่ 3 — ตั้งค่า Google OAuth สำหรับ Supabase Auth

ดูรายละเอียดการตั้งค่า Google Cloud โดยละเอียดได้ที่ [`docs/GOOGLE_OAUTH_SETUP.th.md`](GOOGLE_OAUTH_SETUP.th.md)

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างโปรเจกต์ใหม่หรือเลือกโปรเจกต์ที่มีอยู่
3. ตั้งค่าหน้าจอ OAuth consent screen
4. สร้าง Credentials → OAuth 2.0 Client ID (ประเภท Web application)
5. เพิ่ม Authorized redirect URI จากการตั้งค่า Supabase Auth (`https://<project-ref>.supabase.co/auth/v1/callback`)
6. คัดลอก Client ID และ Client Secret
7. นำค่าไปกรอกที่ Supabase Dashboard: **Authentication** → **Providers** → **Google** → กด **Enabled**

---

## ขั้นตอนที่ 4 — ตั้งค่า Redirect URLs ใน Supabase

ใน Supabase Dashboard → **Authentication** → **URL Configuration** ให้เพิ่ม URL ที่อนุญาต:

* **Site URL**: `http://localhost:3000`
* **Additional Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `https://<your-vercel-domain>.vercel.app/auth/callback`

---

## ขั้นตอนที่ 5 — อัปเดต Schema ฐานข้อมูลและ Migration

ดูรายละเอียดกฎความปลอดภัยระดับตารางได้ที่ [`docs/SUPABASE_RLS_POLICY.th.md`](SUPABASE_RLS_POLICY.th.md)

อัปเดต Schema ไปยัง Supabase PostgreSQL instance ของคุณ:

### ทางเลือก A: อัปเดตผ่าน Drizzle Kit (แนะนำ)
ตรวจสอบว่ามีการกำหนด `DATABASE_URL` ใน `.env.local` แล้วสั่ง push schema โดยตรง:
```bash
pnpm --filter web db:push
```

### ทางเลือก B: ผ่าน Supabase SQL Editor
คัดลอกและสั่งรันสคริปต์ SQL ตามลำดับตัวเลขจาก [`supabase/migrations/`](../supabase/migrations):
1. `0001_initial_schema.sql`
2. `0002_create_profile_trigger.sql`
3. `0003_job_metadata.sql`
4. `0004_lock_server_managed_tables.sql`
5. `0005_selected_format_audio_flag.sql`

เพื่อตรวจสอบว่าตารางถูกสร้างเรียบร้อยแล้ว ให้รันคำสั่งนี้ใน Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

---

## ขั้นตอนที่ 6 — การตั้งค่า Storage Bucket (ตัวเลือกเสริม)

โหมดปกติจะใช้การบันทึกไฟล์ชั่วคราวบนเครื่อง Local (`local_temp`) การใช้ Supabase Storage จึงเป็นทางเลือกเสริม

หากต้องการเปิดใช้งานโหมด Cloud Storage ให้สร้าง Bucket ส่วนตัวใน Supabase Dashboard:
* **ชื่อ Bucket**: `media-downloads`
* **การเข้าถึง**: Private (เปิดใช้ Row Level Security)

รูปแบบโครงสร้างโฟลเดอร์ไฟล์:
```text
{user_id}/{job_id}/output.mp4
{user_id}/{job_id}/output.mp3
```

---

## ขั้นตอนที่ 7 — ตั้งค่าการ Deploy บน Vercel

1. นำเข้า Repository เข้าไปยัง Vercel
2. กำหนด Root Directory: `apps/web`
3. กำหนดค่าตัวแปรสภาพแวดล้อม (Environment Variables) ใน Vercel Dashboard:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_FASTAPI_BASE_URL=https://your-backend-api-url.com
   ```
4. กดสั่ง Deploy

ดูคู่มือการ Deploy บน Vercel ฉบับเต็มได้ที่ [`docs/VERCEL_SETUP.th.md`](VERCEL_SETUP.th.md)

---

## ขั้นตอนที่ 8 — การสั่งรันระบบบนเครื่อง Local

1. **ติดตั้ง Dependencies ทั้งระบบ Monorepo**:
   ```bash
   pnpm install
   pnpm setup:py
   ```

2. **สั่งรันบริการ Development Servers (เปิด 3 หน้าต่าง Terminal ที่ Root)**:
   * **Terminal 1 (Web Frontend)**: `pnpm dev:web`
   * **Terminal 2 (FastAPI Backend)**: `pnpm dev:api`
   * **Terminal 3 (Media Worker)**: `pnpm dev:worker`

หากต้องการ build และเปิดเฉพาะ Next.js production server สำหรับทดสอบ Lighthouse
ให้ตรวจสอบว่าพอร์ต `3000` ว่างอยู่ จากนั้นรัน:

```bash
pnpm production
```

คำสั่งนี้จะไม่เปิด Docker, FastAPI หรือ media worker กด `Ctrl+C`
เพื่อหยุด web server

---

## ขั้นตอนที่ 9 — การตรวจสอบสภาพแวดล้อมระบบ

สั่งรันสคริปต์ตรวจสอบความถูกต้องของค่าแปรสภาพแวดล้อมได้ตลอดเวลา โดยไม่เปิดเผยรหัสลับออกมา:

```bash
pnpm check-env
```

ผลลัพธ์ที่คาดหวัง:
```text
Environment Check
-----------------
NEXT_PUBLIC_SUPABASE_URL: OK
NEXT_PUBLIC_SUPABASE_ANON_KEY: OK
NEXT_PUBLIC_FASTAPI_BASE_URL: OK
SUPABASE_URL: OK
SUPABASE_SERVICE_ROLE_KEY: OK
DATABASE_URL: OK
WORKER_SECRET: OK
-----------------
No secret values were printed.
```
