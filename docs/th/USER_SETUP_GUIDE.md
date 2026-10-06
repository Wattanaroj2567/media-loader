# คู่มือเริ่มต้นใช้งาน

> **ภาษา:** [English](../en/USER_SETUP_GUIDE.md) · **ภาษาไทย**

คู่มือนี้อธิบายการตั้งค่าครั้งแรกสำหรับพัฒนาในเครื่องและนำแอปขึ้นใช้งาน
ให้กรอก credentials ใน environment ของเครื่องหรือหน้า Dashboard ของผู้ให้บริการ
ด้วยตัวเอง ห้ามส่งค่าเหล่านั้นในแชตหรือ commit ลง Git

---

## 1. สร้างโปรเจกต์ Supabase

1. เปิด [Supabase Dashboard](https://supabase.com/dashboard) แล้วสร้างโปรเจกต์
2. เก็บรหัสผ่านฐานข้อมูลไว้ในที่ปลอดภัย
3. เตรียมค่าต่อไปนี้จาก Project Settings สำหรับตั้งค่าในเครื่อง:

   ```text
   Project URL
   Anon public key
   Service role key
   Database connection string (สำหรับคำสั่ง Drizzle Kit)
   ```

Service-role key และ database connection string เป็นข้อมูลลับ ห้ามใส่ในตัวแปร
Frontend, แชต หรือ Git

---

## 2. ตั้งค่า Environment ในเครื่อง

1. คัดลอกไฟล์ตัวอย่างเป็นไฟล์ environment ในเครื่อง:

   ```bash
   cp .env.example .env.local
   ```

2. กรอกค่าด้วยตัวเองในเครื่อง ห้ามนำค่าจริงมาใส่ในแชตหรือเอกสาร
   ตัวแปร Supabase และฐานข้อมูลหลักมีดังนี้:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=your-postgresql-connection-string
   ```

3. ตรวจสอบว่าตัวแปรที่ต้องใช้มีอยู่ โดยคำสั่งจะแสดงสถานะ ไม่จำเป็นต้องแสดงค่า:

   ```bash
   pnpm check-env
   ```

ต้องตั้ง `DATABASE_URL` เมื่อต้องรันคำสั่ง Drizzle Kit ดูรายการปัจจุบันทั้งหมดที่
[Environment Variables](ENVIRONMENT_VARIABLES.md)

---

## 3. ตั้งค่า Google OAuth สำหรับ Supabase Auth

ทำตาม [คู่มือ Google OAuth](GOOGLE_OAUTH_SETUP.md) เพื่อสร้าง Google OAuth Client
และตั้งค่า Google Provider ใน Supabase กรอก Google Client ID และ Client Secret
ใน Supabase Dashboard → **Authentication** → **Providers** → **Google**
ห้ามใส่ Client Secret ในคอนฟิก Frontend

---

## 4. ตั้งค่า Redirect URLs ใน Supabase

ใน Supabase Dashboard → **Authentication** → **URL Configuration**:

- เมื่อนำแอปขึ้นใช้งาน ให้ตั้ง **Site URL** เป็น Production Origin ของ Frontend
  เช่น `https://your-domain.vercel.app`
- เพิ่ม Callback URL ของแอปที่อนุญาตแต่ละ URL ใน **Redirect URLs**:
  - พัฒนาในเครื่อง: `http://localhost:3000/auth/callback`
  - Production: `https://your-domain.vercel.app/auth/callback`

หากพัฒนาในเครื่องอย่างเดียว สามารถใช้ `http://localhost:3000` เป็น Site URL
ได้ เมื่อนำขึ้นใช้งานจริง ให้เปลี่ยน Site URL เป็น Production Origin

---

## 5. สร้าง Database Schema และ Policies

`apps/web/lib/db/schema.ts` เป็นแหล่งข้อมูลหลักของตารางและคอลัมน์แอปพลิเคชัน
เมื่อตั้ง `DATABASE_URL` ในเครื่องแล้ว ให้รัน:

```bash
pnpm --filter web db:push
```

จากนั้นรันสคริปต์นโยบายและ Trigger เฉพาะของโปรเจกต์ใน Supabase SQL Editor:

1. [`supabase/profile_trigger.sql`](../../supabase/profile_trigger.sql)
2. [`supabase/rls_policies.sql`](../../supabase/rls_policies.sql)

ไฟล์ SQL เหล่านี้ใช้สำหรับ Supabase Functions, Triggers และ RLS Policies
ให้กำหนดการเปลี่ยนแปลงตารางหรือคอลัมน์ใน Drizzle ก่อน และอย่าใช้ไฟล์เก่าใน
`supabase/migrations/` เป็นแหล่งข้อมูลหลัก

ดูรายละเอียดได้ที่ [Database Schema](DATABASE_SCHEMA.md) และ
[Supabase RLS Policy](SUPABASE_RLS_POLICY.md)

---

## 6. การจัดเก็บไฟล์สื่อ

ปัจจุบันแอปบันทึกไฟล์ผลลัพธ์ชั่วคราวลง filesystem volume ในเครื่องหรือที่ใช้ร่วมกัน
(`local_temp`) เส้นทางจัดเก็บผลลัพธ์บน Supabase Storage ยังทำไม่ครบ
การสร้าง Storage Bucket หรือตั้งชื่อ Bucket เพียงอย่างเดียวไม่เปิดใช้ cloud storage

เมื่อติดตั้งผ่าน Docker ให้ตรวจว่า API และ Worker ใช้ output volume เดียวกัน
และตั้ง `TEMP_DIR` ให้ตรงกัน ดูคู่มือ [Environment Variables](ENVIRONMENT_VARIABLES.md)
และ [Architecture](ARCHITECTURE.md)

---

## 7. Deploy Frontend บน Vercel

1. Import Repository เข้า Vercel
2. คง **Root Directory** ไว้ที่ไดเรกทอรีหลักของ Repository เพราะ `vercel.json`
   ที่ Root ใช้ตั้งค่า pnpm monorepo build
3. ตั้งค่าตัวแปร Frontend ที่เปิดเผยได้ใน Vercel:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
   NEXT_PUBLIC_FASTAPI_BASE_URL=https://your-backend-api-domain.com
   ```

4. Deploy จากนั้น deploy API และ Worker แยกกัน และตั้งค่า CORS ของ API ให้
   อนุญาต Production Origin ของ Vercel

Production ต้องใช้ HTTPS URL ของ Backend ที่เข้าถึงได้จากภายนอก ค่า `localhost`
ใช้ได้เฉพาะการพัฒนาในเครื่อง ดูรายละเอียดที่ [คู่มือ Vercel](VERCEL_SETUP.md)
ห้ามตั้ง service-role key ในโปรเจกต์ Frontend บน Vercel

---

## 8. เริ่มพัฒนาในเครื่อง

เปิด Terminal ที่ไดเรกทอรีหลักของ Repository แล้วติดตั้ง Dependencies และเริ่มบริการ:

```bash
pnpm install
pnpm setup:py
pnpm dev
```

คำสั่งนี้จะเปิด Web App, FastAPI แบบ reload และ Worker เว็บแอปอยู่ที่
`http://localhost:3000` ส่วน API อยู่ที่ `http://localhost:8000`

หากต้องการ build และเปิดเฉพาะ Next.js production server ในเครื่องเพื่อทดสอบ
Lighthouse ให้ตรวจว่าพอร์ต `3000` ว่าง แล้วรัน `pnpm production` คำสั่งนี้จะไม่เปิด
Docker, API หรือ Worker กด `Ctrl+C` เพื่อหยุดการทำงาน

---

## 9. ตรวจสอบ Environment

รันจากไดเรกทอรีหลักของ Repository เมื่อต้องการตรวจว่ามีตัวแปรที่จำเป็น:

```bash
pnpm check-env
```

ตัวตรวจจะแสดงเฉพาะสถานะ ผลผ่านไม่ได้ตรวจไฟล์ Frontend ที่ Compile แล้ว
จึงห้ามใช้ผลนี้ยืนยันว่าไม่มี secret ถูกเปิดเผยใน bundle
