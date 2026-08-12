# โครงสร้างฐานข้อมูล (Database Schema)

[English](DATABASE_SCHEMA.md) | ภาษาไทย

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
| `user_id` | uuid | เจ้าของคิวงาน |
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
| `output_format` | text | ฟอร์แมตไฟล์ผลลัพธ์ (mp4, mp3, original) |
| `status` | text | สถานะงานปัจจุบัน |
| `progress` | integer | ความคืบหน้า (0-100%) |
| `error_message` | text | ข้อความแสดงข้อผิดพลาดที่ปลอดภัย |
| `storage_bucket` | text | ชื่อ Supabase Storage Bucket (สำหรับโหมด Cloud) |
| `storage_path` | text | พาธไฟล์ชั่วคราวบน Local Temp หรือ Storage Path |
| `file_size` | bigint | ขนาดไฟล์เมื่อประมวลผลเสร็จสิ้น (Bytes) |
| `rights_confirmed` | boolean | การยืนยันสิทธิ์ของผู้ใช้ |
| `locked_at` | timestamptz | เวลาที่ Worker ล็อกคิวงานไปทำ |
| `locked_by` | text | รหัสระบุ Worker ที่กำลังประมวลผล |
| `created_at` | timestamptz | เวลาที่สร้างงาน |
| `updated_at` | timestamptz | เวลาที่อัปเดตสถานะ |
| `completed_at` | timestamptz | เวลาที่ประมวลผลเสร็จสิ้น |

---

## 3. ตาราง `policy_logs`

บันทึกประวัติการตรวจสอบนโยบายสิทธิ์ก่อนวิเคราะห์หรือดาวน์โหลด

| คอลัมน์ (Column) | ประเภท (Type) | คำอธิบาย (Notes) |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | ผู้ใช้งานที่ส่งคำขอ |
| `target_url` | text | URL ที่ส่งเข้าตรวจ |
| `allowed` | boolean | ผลการอนุมัติ (true = อนุญาต, false = ปฏิเสธ) |
| `reason_code` | text | รหัสเหตุผล (เช่น ALLOWED_PUBLIC, BLOCKED_DRM) |
| `checked_at` | timestamptz | เวลาที่ทำการตรวจ |
