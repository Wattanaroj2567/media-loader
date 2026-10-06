# สถาปัตยกรรมระบบ

> **ภาษา:** [English](../en/ARCHITECTURE.md) · **ภาษาไทย**

## ภาพรวม

Media Loader แยกเว็บแอป, API, Worker และ egress proxy ที่ตรวจปลายทาง
เพื่อให้แต่ละบริการรับผิดชอบงานชัดเจน

```text
apps/web      → เว็บแอป Next.js บน Vercel
apps/api      → FastAPI สำหรับนโยบาย URL การวิเคราะห์ งาน และไฟล์
apps/worker   → Python Worker สำหรับประมวลผลสื่อจากคิว
apps/proxy    → Public-IP egress proxy สำหรับ request จาก URL ของผู้ใช้
supabase      → Auth และตาราง PostgreSQL ที่ป้องกันด้วย RLS
```

โหมดเริ่มต้น `local_temp` กำหนดให้ API และ Worker ใช้ volume สำหรับไฟล์สื่อ
ร่วมกัน ใน Docker Compose ทั้งสอง container mount named volume `media-output`
Worker ที่อยู่คนละเครื่องต้องไม่รับงานซึ่งไม่สามารถใช้ไฟล์ร่วมกับ API ได้

ดู[แผนภาพสถาปัตยกรรม](../diagrams/media-loader-architecture.html) หรือ
[แผนภาพโหมดมืด](../diagrams/media-loader-architecture-dark.html)

## รูปแบบการรัน

ระหว่างพัฒนา `pnpm dev` จะเปิดทั้งสามบริการจาก repository โดย Next.js และ
FastAPI จะ reload เมื่อแก้ source code

```text
Next.js Local Dev → localhost:3000
FastAPI Local Dev → localhost:8000
Worker Local Dev  → ตรวจและประมวลผลงานในคิว
```

Docker Compose ใช้เปิด API, Worker และ egress proxy สำหรับตรวจ integration
ในสภาพใกล้เคียง production หรือ deploy บน container host API และ Worker ทำงาน
ด้วยผู้ใช้ non-root `media-loader` แชร์ named volume และไม่มีเส้นทางออกสู่อินเทอร์เน็ต
โดยตรง request ที่มาจาก URL ผู้ใช้ต้องผ่าน proxy ซึ่งตรวจ DNS answers ทั้งหมดและ
เชื่อมต่อไปยัง public IP ที่ตรวจแล้ว Compose ยังรันตัวตั้งสิทธิ์ output แบบครั้งเดียว
โดยแยกเครือข่ายก่อนเปิด API เพื่อกำหนดเจ้าของโฟลเดอร์เป็น UID/GID `10001`
ส่วน Vercel โฮสต์เฉพาะ Next.js และเรียก API ผ่าน HTTPS

```text
apps/web บน Vercel       → HTTPS → FastAPI ใน container
API ใน container         → checked egress proxy → public source hosts
Worker ใน container      → checked egress proxy → public source hosts
Worker ใน container      → ตรวจคิวและเขียนไฟล์ลง shared media volume
FastAPI ใน container     → ส่งไฟล์ที่ผ่านการตรวจสิทธิ์จาก volume เดียวกัน
```

## ทำไมต้องแยก Worker?

การประมวลผลสื่อใช้เวลาและทรัพยากร CPU, หน่วยความจำ และพื้นที่จัดเก็บ
Worker รับผิดชอบ:

- ดึงข้อมูลสื่อและประมวลผลด้วย yt-dlp
- แปลงหรือรวมไฟล์ด้วย FFmpeg
- จัดการไฟล์ผลลัพธ์ชั่วคราว
- อัปเดตความคืบหน้าและสถานะงาน
- ล้างไฟล์ชั่วคราวที่หมดอายุ

การแยก Worker ทำให้งานประมวลผลหนักไม่อยู่ใน Vercel Functions หรือ
Supabase Edge Functions

## ลำดับการทำงาน

### เข้าสู่ระบบ

```text
ผู้ใช้ → Next.js → Supabase Auth → Dashboard
```

คำขอ API ของผู้ใช้ที่ล็อกอินจะส่ง Supabase access token ปัจจุบัน

### วิเคราะห์ URL

```text
ผู้ใช้ส่ง URL
  ↓
Next.js เรียก FastAPI /media/analyze
  ↓
FastAPI ตรวจ URL, resolve DNS ทั้งสอง IP family และใช้นโยบาย
  ↓
FastAPI ดึงข้อมูลต้นทางผ่าน checked egress proxy
  ↓
FastAPI ดึง metadata และ format ที่มีเมื่ออนุญาต
  ↓
FastAPI ส่งผลการวิเคราะห์กลับ
```

ผู้เยี่ยมชมและผู้ใช้ที่ล็อกอินวิเคราะห์ URL ได้ หากมี session ที่ล็อกอิน
ระบบจะผูกผลการตัดสินนโยบายกับบัญชีนั้น

### สร้างงาน

```text
ผู้ใช้เลือกรูปแบบที่มีและยืนยันสิทธิ์
  ↓
Next.js เรียก FastAPI /downloads
  ↓
FastAPI ตรวจ URL, policy, analysis, format และการยืนยันสิทธิ์ซ้ำ
  ↓
FastAPI เข้ารหัส URL ต้นทางและสร้างแถว QUEUED พร้อม worker pool เป้าหมาย
  ↓
Worker ใน pool นั้นรับงาน
```

งานผู้ใช้ที่ล็อกอินผูกกับ `user_id` ส่วนงานผู้เยี่ยมชมใช้
`X-Guest-Session-ID` ในโหมด local temp ต้องกำหนด pool ให้ถูกต้อง
เพื่อไม่ให้ Worker รับงานเมื่อแชร์ filesystem กับ API ไม่ได้

### ประมวลผลงาน

```text
Worker รับงาน
  ↓
Worker ถอดรหัส URL และประมวลผลสื่อผ่าน egress proxy ด้วย yt-dlp และ FFmpeg
  ↓
Worker เขียนไฟล์ลง shared local temp volume โดยค่าเริ่มต้น
  ↓
Worker อัปเดตสถานะและความคืบหน้าของงาน
```

### ส่งไฟล์ให้ผู้ใช้

สำหรับผู้ใช้ที่ล็อกอิน เส้นทางดาวน์โหลดผ่านเว็บจะตรวจ session cookie ของ
Next.js แล้ว stream ข้อมูลจาก FastAPI งานผู้เยี่ยมชมขอ download token อายุสั้น
เพื่อนำไป stream ไฟล์ของตนเองได้

เมื่อดาวน์โหลดสำเร็จ ระบบจะไม่ลบไฟล์ทันที Worker จะลบไฟล์ที่หมดอายุตาม
ระยะเวลา retention ซึ่งค่าเริ่มต้นคือ 60 นาที เจ้าของงานสั่งลบไฟล์เองได้เช่นกัน
ประวัติงานยังคงอยู่หลังลบไฟล์

บนอุปกรณ์มือถือที่รองรับ เว็บแอปสามารถดึงไฟล์เพื่อเปิด native share sheet ได้
เส้นทางดาวน์โหลด same-origin ยังใช้ได้สำหรับผู้ใช้ที่ล็อกอิน

## องค์ประกอบหลัก

### เว็บแอป Next.js

- หน้าล็อกอินและ Dashboard
- วิเคราะห์ URL และเลือกรูปแบบไฟล์
- หน้าคิว ประวัติ และการตั้งค่า
- ส่งไฟล์ผ่าน same-origin route ที่ตรวจ session สำหรับผู้ใช้ที่ล็อกอิน

### FastAPI

- ตรวจสอบ URL และตัดสินนโยบาย
- วิเคราะห์ metadata และส่งรายการ format
- สร้างและจัดการงานโดยจำกัดขอบเขตตามผู้ใช้หรือ guest session
- ตรวจเจ้าของก่อนส่งหรือลบไฟล์ local
- ลบบัญชีผู้ใช้
- เข้ารหัส URL ก่อนบันทึกงาน และส่ง request ต้นทางผ่าน egress proxy

### Worker

- รับงานตาม worker pool ที่กำหนด
- ประมวลผลสื่อและอัปเดตความคืบหน้า
- เขียนไฟล์ลง local temp storage ที่แชร์กับ API
- ลบไฟล์ชั่วคราวที่หมดอายุ
- ถอดรหัส URL จากคิวและส่ง request ต้นทางผ่าน proxy

### SSRF proxy

- resolve ปลายทางและปฏิเสธ DNS answer ที่ไม่ใช่ public
- เชื่อมต่อ numeric address ที่ตรวจแล้วเพื่อป้องกัน DNS rebinding
- รับ HTTP redirect และ HTTPS CONNECT ผ่านการตรวจแบบเดียวกัน

### Supabase

- ยืนยันตัวตนและจัดเก็บโปรไฟล์ผู้ใช้
- เก็บข้อมูลคิวงานและ policy logs
- บังคับใช้นโยบาย RLS สำหรับข้อมูลของผู้ใช้

รายการ format ที่วิเคราะห์ได้จะส่งกลับจาก API ส่วน format ที่เลือกและ metadata
ที่เกี่ยวกับงานจะอยู่ใน `download_jobs` ปัจจุบันไม่มีตาราง `media_formats` แยกต่างหาก

## การเป็นเจ้าของข้อมูล

แถวงานของผู้ใช้ที่ล็อกอินจำกัดด้วย `user_id` งานผู้เยี่ยมชมมี `user_id`
เป็นค่าว่างและจำกัดด้วย `guest_session_id` ผ่าน API Browser client
ไม่สามารถแก้ไขแถวคิวงานหรือ policy log ที่บริการจัดการเองได้ FastAPI และ
Worker เป็นผู้เขียนข้อมูลจากฝั่งที่เชื่อถือได้

RLS ปกป้องแถวข้อมูลของผู้ใช้ใน Supabase ส่วน service-role key สามารถข้าม RLS
ได้ จึงต้องเก็บไว้ในสภาพแวดล้อมฝั่ง API/Worker ที่เชื่อถือได้เท่านั้น

## วงจรสถานะงาน

```text
PENDING → ANALYZING → READY → QUEUED → DOWNLOADING → CONVERTING → UPLOADING → COMPLETED
หยุดชั่วคราวได้: PENDING / READY / QUEUED / DOWNLOADING / CONVERTING → PAUSED → QUEUED
ยกเลิกได้: PENDING / ANALYZING / READY / QUEUED / DOWNLOADING / CONVERTING / UPLOADING / PAUSED → CANCELLED
ทุกสถานะ → FAILED
ทุกสถานะ → BLOCKED
```

API อนุญาตให้หยุดชั่วคราวเฉพาะสถานะที่ระบุไว้ เมื่อ resume แล้วงานจะกลับไป
`QUEUED` เพื่อรอ Worker ใน pool เป้าหมาย

## ข้อจำกัดสำคัญ

- ตรวจ URL ทุกครั้งก่อนเชื่อมต่อเครือข่าย และตรวจนโยบายก่อนวิเคราะห์
- ส่ง network request ที่มาจาก URL ผู้ใช้ผ่าน egress proxy และปิด direct egress
  ของ API/Worker ใน deployment
- ตั้ง `MEDIA_URL_ENCRYPTION_KEY` ค่าเดียวกันและเก็บอย่างปลอดภัยให้ API กับ Worker
- ต้องให้ผู้ใช้ยืนยันสิทธิ์เมื่อสร้างงาน
- ประมวลผลสื่อใน Worker นอก Vercel Functions
- โหมด local temp ต้องให้ API และ Worker ใช้ output volume ร่วมกัน
- จำกัดงานและไฟล์ตามเจ้าของที่ล็อกอินหรือ guest session
- ห้ามเปิดเผย service-role key ในโค้ดเบราว์เซอร์
- ใช้ `local_temp` สำหรับไฟล์ผลลัพธ์; การจัดเก็บและส่งไฟล์ผ่าน Cloud Object Storage ยังทำไม่ครบ
