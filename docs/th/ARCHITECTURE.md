# สถาปัตยกรรมระบบ (System Architecture)

> **ภาษา:** [English](../en/ARCHITECTURE.md) · **ภาษาไทย**

## ภาพรวมสถาปัตยกรรม (Overview)

Media Loader ถูกออกแบบสถาปัตยกรรมแบบแยกส่วน (Decoupled Architecture) เพื่อให้แต่ละส่วนทำงานตามหน้าที่หลักของตนเองอย่างมีประสิทธิภาพ:

```text
apps/web      → Next.js Frontend ทำงานบน Vercel
apps/api      → FastAPI Service สำหรับตรวจสอบนโยบาย วิเคราะห์ URL และสร้างคิวงาน (รันแบบ Local / Docker)
apps/worker   → Python Media Worker สำหรับประมวลผลดาวน์โหลดและแปลงไฟล์หนักๆ (รันแบบ Local / Docker)
supabase      → Auth, PostgreSQL Database, Storage และ Row Level Security (RLS)
```

ดูไดอะแกรมสถาปัตยกรรมฉบับเต็มได้ที่ [docs/diagrams/media-loader-architecture.html](../diagrams/media-loader-architecture.html) (หรือ [Dark Mode](../diagrams/media-loader-architecture-dark.html))

---

## รูปแบบการรัน Local และ Container

ระหว่างพัฒนาให้ใช้ `pnpm dev` จาก Root ของโปรเจกต์เพื่อเปิด Web, FastAPI แบบ reload
และ Worker พร้อมกันโดยตรง จึงไม่ต้อง rebuild image ทุกครั้งที่แก้ source code

```text
Next.js Local Dev → localhost:3000
FastAPI Local Dev → localhost:8000
Worker Local Dev  → ตรวจและประมวลผลงานในคิว
```

Docker ใช้สำหรับตรวจระบบแบบ production-like และ deploy API/Worker บนเครื่องหรือ
container host แยกจาก Vercel ตัว container ใช้ source แบบ immutable, ทำงานด้วย
ผู้ใช้ non-root และแชร์ named volume สำหรับไฟล์ผลลัพธ์ ส่วน Vercel โฮสต์เฉพาะ Web

```text
apps/web บน Vercel       → HTTPS → FastAPI Container
Worker Container         → ตรวจคิวและเขียนไฟล์ลง Shared Volume
FastAPI Container        → ส่งไฟล์ที่ผ่านการตรวจสิทธิ์จาก Shared Volume
```

---

## ทำไมต้องแยกส่วน Worker? (Why Split the Worker?)

การประมวลผลสื่อ (ดาวน์โหลดและแปลงไฟล์วิดีโอ/เสียง) เป็นงานที่ใช้เวลาและทรัพยากรสูง

หน้าที่หลักของ Worker ได้แก่:

- การเรียกใช้งาน `yt-dlp` ในโหมดควบคุมความปลอดภัย
- การประมวลผลไฟล์ด้วย `FFmpeg` (การตัดต่อ แปลงไฟล์ และสกัดเสียง)
- การบริหารจัดการไฟล์ชั่วคราว (Temporary File Cleanup)
- การเตรียมไฟล์ผลลัพธ์บนเครื่อง Local สำหรับการดาวน์โหลด
- การอัปเดตความคืบหน้า (Progress Tracking) และความเร็วในการดาวน์โหลดแบบเรียลไทม์

การแยกส่วนนี้ช่วยป้องกันไม่ให้งานหนักส่งผลกระทบต่อ Web Server หรือเกินข้อจำกัดของ Serverless Functions บน Vercel

---

## ลำดับการไหลของคำขอ (Request Flow)

### 1. การเข้าสู่ระบบ (Login)

```text
ผู้ใช้งาน ──> ล็อกอินผ่าน Google ──> Supabase Auth ──> คืนค่า JWT Session ──> Next.js Web App
```

### 2. การวิเคราะห์ URL (URL Analysis)

```text
กรอก URL ──> Web App ──> FastAPI (/media/analyze) ──> ตรวจสอบ SSRF & Policy ──> คืนค่ารายการฟอร์แมตสด
```

### 3. การสร้างและประมวลผลคิวงาน (Job Queue Processing)

```text
เลือกฟอร์แมตและยืนยันสิทธิ์ ──> Web App ──> FastAPI (POST /downloads)
                                              │ ตรวจ URL, Policy และ Analysis ซ้ำ
                                              ↓
                              บันทึก Job ลง Supabase DB (Status: QUEUED)
                                              │ พร้อมเป้าหมาย pool:local / pool:cloud
Worker ใน pool เดียวกันรับงาน ◄───────────────┘
    │
    ├──> ดาวน์โหลดสื่อผ่าน yt-dlp
    ├──> แปลงไฟล์ MP4, MP3 หรือ GIF ด้วย FFmpeg
    ├──> อัปเดตความคืบหน้าลง DB (Status: DOWNLOADING / CONVERTING)
    └──> บันทึกไฟล์ผลลัพธ์ลง Local Temp / Storage (Status: COMPLETED)
```

หลัง FastAPI รับงานเข้าคิวแล้ว Web App จะล้างผลวิเคราะห์และเตรียมช่อง URL สำหรับลิงก์ถัดไปทันที
ส่วนการ polling คิวและการประมวลผลของ Worker จะทำงานเบื้องหลังต่อไป เมื่อไฟล์พร้อมระบบจะใช้
ขั้นตอนส่งไฟล์เข้าเบราว์เซอร์อัตโนมัติเดิม

การแยก worker pool จำเป็นในโหมด Local Temp เพราะ worker แต่ละเครื่องสามารถใช้
Supabase ชุดเดียวกันได้ แต่ไม่สามารถอ่านไฟล์ข้าม filesystem ของกันและกัน

### 4. การส่งไฟล์เข้าเบราว์เซอร์

```text
งาน COMPLETED
    ↓
Desktop เปิด `/api/files/download/{job_id}` แบบ same-origin
    ↓
Next.js ตรวจ session และ stream ไฟล์จาก FastAPI โดยไม่โหลดทั้งไฟล์เข้า RAM
    ↓
Chrome บันทึกลง Downloads หรือแสดง Save As ตามการตั้งค่าของผู้ใช้
```

บน iOS และ Android ระบบจะแสดงตัวเลือกเฉพาะมือถือเมื่อไฟล์พร้อม ผู้ใช้เลือก
Share Sheet เพื่อบันทึกลง Photos/Files หรือเลือกดาวน์โหลดตามปกติได้ โดย flow
ที่รับผิดชอบส่งไฟล์จะเป็นผู้แสดงผลสำเร็จเพียงจุดเดียว เพื่อไม่ให้ polling
ที่ซ้อนกันสร้าง Toast ซ้ำ

---

## การรักษาความปลอดภัยของรหัสผ่านและความลับ (Secrets Protocol)

- ห้ามพิมพ์หรือบันทึกรหัสผ่านลับลงใน Log หรือ Console
- ห้าม commit ไฟล์ `.env.local` ลงใน Git Repository
- ฝั่ง Frontend จะเข้าถึงเฉพาะ `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` และ `NEXT_PUBLIC_FASTAPI_BASE_URL` เท่านั้น
