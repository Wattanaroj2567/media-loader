# โครงสร้างฐานข้อมูล (Database Schema)

> **ภาษา:** [English](../en/DATABASE_SCHEMA.md) · **ภาษาไทย**

Supabase PostgreSQL เป็นฐานข้อมูลหลักของโปรเจกต์

ทุกตารางที่เป็นของผู้ใช้ต้องมีคอลัมน์ `user_id uuid references auth.users(id)` และบังคับใช้ Row Level Security (RLS)

---

## 1. ตาราง `profiles`

เก็บข้อมูลโปรไฟล์ผู้ใช้ที่คัดลอกจากเมตาเดตาของ Supabase Auth

| คอลัมน์ (Column) | ประเภท (Type) | คำอธิบาย (Notes) |
|---|---|---|
| `id` | uuid | Primary key, อ้างอิงถึง auth.users(id) |
| `email` | text | อีเมลของผู้ใช้ |
| `full_name` | text | ชื่อที่ใช้แสดงผล |
| `avatar_url` | text | รูปภาพโปรไฟล์ |
| `created_at` | timestamptz | เวลาที่สร้าง |
| `updated_at` | timestamptz | เวลาที่แก้ไขล่าสุด |

---

## 2. ตาราง `download_jobs`

เก็บข้อมูลคิวงานดาวน์โหลดและแปลงไฟล์สื่อแต่ละรายการ

| คอลัมน์ (Column) | ประเภท (Type) | คำอธิบาย (Notes) |
|---|---|---|
| `id` | uuid | Primary key (ID งาน) |
| `user_id` | uuid | เจ้าของคิวงาน (nullable สำหรับผู้ใช้ทั่วไปที่ไม่ได้ล็อกอิน) |
| `guest_session_id` | text | Session ID ชั่วคราวของ Guest สำหรับติดตามความคืบหน้างานโดยไม่ต้องล็อกอิน |
| `original_url` | text | URL ของสื่อที่ส่งเข้ามา |
| `platform` | text | แพลตฟอร์ม (direct, youtube, tiktok ฯลฯ) |
| `title` | text | ชื่อเรื่อง/หัวข้อสื่อ |
| `uploader` | text | ชื่อผู้สร้าง/เจ้าของช่อง |
| `source_domain` | text | โดเมนต้นทาง |
| `thumbnail_url` | text | รูปภาพตัวอย่าง |
| `duration_seconds` | integer | ความยาวของสื่อ (วินาที) |
| `media_type` | text | ประเภทสื่อ (video, audio, unknown) |
| `selected_format_id` | text | ID ฟอร์แมตที่เลือก |
| `selected_quality` | text | ข้อความแสดงความละเอียดที่เลือก |
| `selected_has_audio` | boolean | ฟอร์แมตวิดีโอที่เลือกมีเสียงในตัวหรือไม่ |
| `output_format` | text | ฟอร์แมตไฟล์ผลลัพธ์ (mp4, mp3, gif, original) |
| `status` | text | สถานะงานปัจจุบัน |
| `progress` | integer | ความคืบหน้า (0-100%) |
| `error_message` | text | ข้อความแสดงข้อผิดพลาดที่ปลอดภัย |
| `storage_bucket` | text | ชื่อ Supabase Storage Bucket (สำหรับโหมด Cloud) |
| `storage_path` | text | พาธไฟล์ชั่วคราวบน Local Temp หรือ Storage Path |
| `file_size` | bigint | ขนาดไฟล์เมื่อประมวลผลเสร็จสิ้น (Bytes) ไม่ถูกเขียนทับด้วยค่าประมาณการ |
| `total_bytes_estimate` | bigint | ขนาดประมาณการจากต้นทางระหว่างดาวน์โหลด (Bytes) |
| `rights_confirmed` | boolean | การยืนยันสิทธิ์ของผู้ใช้ |
| `locked_at` | timestamptz | เวลาที่ Worker ล็อกคิวงานไปทำ |
| `locked_by` | text | ระหว่างรอคิวเก็บเป้าหมาย `pool:<environment>`; ระหว่างประมวลผลเก็บรหัส Worker |
| `created_at` | timestamptz | เวลาที่สร้างงาน |
| `updated_at` | timestamptz | เวลาที่อัปเดตสถานะ |
| `completed_at` | timestamptz | เวลาที่ประมวลผลเสร็จสิ้น |
| `download_speed` | bigint | ความเร็วเฉลี่ยในการดาวน์โหลด (Bytes/sec) |

---

## 3. ตาราง `policy_logs`

บันทึกประวัติการตรวจสอบนโยบายสิทธิ์ก่อนวิเคราะห์หรือดาวน์โหลด

| คอลัมน์ (Column) | ประเภท (Type) | คำอธิบาย (Notes) |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | ผู้ใช้งานที่ส่งคำขอ (nullable สำหรับ guest) |
| `url` | text | URL สื่อต้นทาง |
| `platform` | text | แพลตฟอร์มที่ตรวจพบ (direct, youtube, tiktok ฯลฯ) |
| `decision` | text | ผลการตัดสิน (allowed, blocked, needs_confirmation) |
| `reason` | text | เหตุผลหรือคำอธิบายผลการตรวจสอบนโยบาย |
| `created_at` | timestamptz | เวลาที่บันทึกการตรวจสอบ |

---

## ยุทธศาสตร์การจัดการฐานข้อมูลแบบสองชั้น (Dual-Layer Database Strategy)

ทุกการดำเนินการกับฐานข้อมูลต้องปฏิบัติตามกฎสองชั้นนี้เสมอ:

### 1. โครงสร้างตารางและการย้ายข้อมูลคอลัมน์ (Drizzle ORM)

- `apps/web/lib/db/schema.ts` คือ **แหล่งความจริงเดียว (Single Source of Truth)** สำหรับตาราง, คอลัมน์, ข้อจำกัด (constraints) และดัชนี (indexes) ทั้งหมด
- เมื่อต้องการเพิ่มตารางใหม่หรือแก้ไขคอลัมน์ ให้กำหนดหรือแก้ไขใน `apps/web/lib/db/schema.ts` ก่อนเสมอ
- ห้ามใช้คำสั่ง Raw SQL (`CREATE TABLE`, `ALTER TABLE`) ในการสร้างหรือแก้ไขตารางแอปพลิเคชันโดยตรง
- ใช้ `pnpm --filter web db:push` เพื่ออัปเดตสคีมาในระหว่างการพัฒนา หรือ `pnpm --filter web db:generate` เพื่อสร้างไฟล์ migration
- ส่งออก TypeScript types จาก `schema.ts` เพื่อความปลอดภัยของประเภทข้อมูลทั่วทั้งเว็บแอป

### 2. นโยบายและทริกเกอร์เฉพาะของ Supabase (Raw SQL ใน `supabase/`)

- ใช้ไฟล์ Raw SQL ภายใต้ `supabase/migrations/` หรือ `supabase/rls_policies.sql` สำหรับ:
  - นโยบาย Row Level Security (RLS) (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`, `CREATE POLICY ...`)
  - ทริกเกอร์ PostgreSQL (เช่น การสร้างโปรไฟล์ผู้ใช้เมื่อสมัครผ่าน Google Auth ใน `auth.users`)
  - ฟังก์ชัน, Stored Procedures หรือส่วนขยาย (Extensions) ของ PostgreSQL
