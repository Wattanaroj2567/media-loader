# แนวทางจัดการข้อมูลลับ

> **ภาษา:** [English](../en/SECRETS_PROTOCOL.md) · **ภาษาไทย**

โปรเจกต์นี้มีแนวทางเคร่งครัดในการจัดการข้อมูลลับ ผู้ใช้เป็นผู้กรอกและดูแลค่า
เหล่านั้น Agent อธิบายการตั้งค่าและตรวจสอบได้โดยไม่เห็นหรือพิมพ์ค่าจริง

---

## กฎหลัก

Agent อธิบายแหล่งที่มาของ credentials ตำแหน่งที่ควรตั้งค่า และวิธีตรวจสอบอย่าง
ปลอดภัยได้ ห้ามขอให้ผู้ใช้ส่งค่าความลับลงในแชต

---

## สิ่งที่ Agent ทำได้

- อธิบายวิธีคัดลอกไฟล์ตัวอย่างเป็น `.env.local` ในเครื่อง
- อธิบายตำแหน่งตั้งค่า Supabase และ Google OAuth credentials
- อธิบายตำแหน่งตั้งค่า Environment Variables สำหรับ Deployment
- ตรวจว่ามีชื่อตัวแปรที่จำเป็นหรือไม่
- รันคำสั่งตรวจสอบการเชื่อมต่อหรือคอนฟิกที่ไม่เปิดเผยค่าจริง
- รายงานเฉพาะสถานะที่ปลอดภัย เช่น `OK`, `Missing` หรือ `Invalid`

## สิ่งที่ Agent ห้ามทำ

- อ่าน พิมพ์ แก้ไข หรือ commit ไฟล์ `.env` หรือแหล่งเก็บ credentials อื่น
- ขอให้ผู้ใช้ส่ง credentials ลงในแชต
- พิมพ์ค่าความลับใน command output, log หรือไฟล์ที่สร้างขึ้น
- ใส่ Supabase service-role key หรือ Google OAuth Client Secret ในโค้ดเบราว์เซอร์
  หรือตัวแปร `NEXT_PUBLIC_`
- บันทึก JWT, access token, tunnel token หรือ signed download URL ลงใน log

---

## ขั้นตอนตั้งค่าที่ปลอดภัย

1. ผู้ใช้คัดลอกไฟล์ environment ตัวอย่างเป็น `.env.local`
2. ผู้ใช้ขอและกรอก credentials ในเครื่องหรือ Dashboard ของผู้ให้บริการ
3. ผู้ใช้ยืนยันว่าตั้งค่าแล้วโดยไม่ส่งค่าจริง
4. Agent รัน `pnpm check-env` ได้ แล้วรายงานเฉพาะสถานะของตัวแปร

---

## ผลตรวจสอบที่ปลอดภัย

ผลตรวจที่ยอมรับได้จะแสดงเฉพาะสถานะ:

```text
Environment Check
NEXT_PUBLIC_SUPABASE_URL: OK
NEXT_PUBLIC_SUPABASE_ANON_KEY: OK
SUPABASE_SERVICE_ROLE_KEY: OK
WORKER_SECRET: OK
No secret values were printed.
```

ห้ามพิมพ์ค่าตัวแปรหรือบางส่วนของ credentials การตรวจทั่วไปไม่จำเป็นต้อง mask
ค่า และควรหลีกเลี่ยงการแสดงค่าจริงทุกกรณี

`pnpm check-env` ตรวจว่ามีชื่อตัวแปรที่กำหนดไว้ และตรวจรูปแบบ public variables
อย่างง่ายเท่านั้น ไม่ได้ตรวจ frontend bundle ที่ build แล้ว ผลผ่านจึงไม่ได้ยืนยันว่า
ไม่มี secret ถูกนำเข้า bundle

---

## ตำแหน่งจัดเก็บความลับ

### ค่าคอนฟิกสาธารณะที่เบราว์เซอร์มองเห็น

ใส่เฉพาะคอนฟิกสาธารณะที่เบราว์เซอร์เห็นได้ในตัวแปรขึ้นต้นด้วย `NEXT_PUBLIC_`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FASTAPI_BASE_URL=
```

### Credentials ที่ใช้เฉพาะฝั่ง Backend

เก็บ Supabase service credentials และคอนฟิก runtime ส่วนตัวไว้บนโฮสต์ของ API หรือ
Worker เท่านั้น ห้ามตั้ง `SUPABASE_SERVICE_ROLE_KEY` ในโปรเจกต์ Frontend บน Vercel

`DATABASE_URL` ใช้กับเครื่องมือ Drizzle Kit และควรใส่เฉพาะ environment ที่รัน
คำสั่งเหล่านั้น ปัจจุบัน `WORKER_SECRET` เป็นค่าที่ `pnpm check-env` ตรวจ แต่โค้ด
แอปยังไม่ได้ใช้ค่านี้เพื่อยืนยันตัวตน Worker การตั้งค่านี้จึงไม่ได้เปิดระบบ Auth

Google OAuth Client ID และ Client Secret ให้ตั้งใน Dashboard ของ Supabase Auth
ห้ามใส่ Client Secret ในคอนฟิก Frontend หรือไฟล์ของ Repository

ดูรายการตัวแปรปัจจุบันที่ [Environment Variables](ENVIRONMENT_VARIABLES.md) และ
วิธี Deploy Frontend ที่ [Vercel Setup](VERCEL_SETUP.md)

---

## กฎ Git

ห้าม commit ไฟล์ environment หรือ credentials ที่มีค่าจริง Repository จะ ignore
ไฟล์ environment ในเครื่อง ให้ commit เฉพาะ template เช่น `.env.example` หลังตรวจ
แล้วว่าไม่มี credentials จริงอยู่ในไฟล์
