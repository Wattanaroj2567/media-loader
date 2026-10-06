# คู่มือ Row Level Security ของ Supabase

> **ภาษา:** [English](../en/SUPABASE_RLS_POLICY.md) · **ภาษาไทย**

คู่มือนี้อธิบายรูปแบบ Row Level Security (RLS) ที่ใช้กับ Supabase ในปัจจุบัน

การดูแลฐานข้อมูลแบ่งความรับผิดชอบดังนี้:

```text
apps/web/lib/db/schema.ts    → ตาราง คอลัมน์ ข้อจำกัด และดัชนีของแอป
supabase/profile_trigger.sql → ฟังก์ชันและ trigger สำหรับโปรไฟล์จาก Auth
supabase/rls_policies.sql    → นโยบาย Row Level Security
```

ไฟล์ SQL ใน `supabase/migrations/` เป็นไฟล์ bootstrap เก่าที่เก็บไว้เป็นประวัติ
ห้ามเพิ่มตารางแอปหรือแก้คอลัมน์ใหม่ในไฟล์เหล่านั้น ให้แก้ผ่าน Drizzle schema

## กฎหลัก

ผู้ใช้ที่ล็อกอินอ่านได้เฉพาะแถวข้อมูลของบัญชีตนเอง นโยบายใช้เงื่อนไข
`auth.uid() = user_id` สำหรับแถวของผู้ใช้ หรือ `auth.uid() = id` สำหรับโปรไฟล์

งานผู้เยี่ยมชมไม่มี Supabase user ID โดย API จะจำกัดการเข้าถึงงานด้วย
`guest_session_id` เว็บเบราว์เซอร์ไม่อ่านงาน guest ผ่าน Supabase โดยตรง

schema ปัจจุบันมีตาราง public สามตาราง ได้แก่ `profiles`, `download_jobs`
และ `policy_logs` รายการ format ที่วิเคราะห์ได้เป็นข้อมูลใน API response
ส่วน format ที่เลือกและ metadata ของงานจัดเก็บใน `download_jobs` ไม่มีตาราง
`media_formats` แยกต่างหาก

## ตารางที่ต้องเปิด RLS

```text
profiles
download_jobs
policy_logs
```

ต้องเปิด RLS บนทุกตารางในรายการ

## รูปแบบนโยบาย

สำหรับแถวที่มี `user_id` และผู้ใช้มีสิทธิ์อ่าน:

```sql
using (auth.uid() = user_id)
```

สำหรับ `profiles` ที่ `id` อ้างอิง `auth.users(id)`:

```sql
using (auth.uid() = id)
with check (auth.uid() = id)
```

Browser client อ่านได้เฉพาะแถว `download_jobs` และ `policy_logs` ของตน
แต่ไม่มี policy สำหรับ insert, update หรือ delete ตารางเหล่านี้ถูกจัดการ
จากฝั่ง server FastAPI และ Worker เขียนข้อมูลหลังตรวจนโยบายและเจ้าของงานแล้ว

## Service-role key

Supabase service-role key สามารถข้าม RLS ได้ ดังนั้น:

- เก็บไว้เฉพาะ environment ของ API หรือ Worker ที่เชื่อถือได้
- ห้ามเปิดเผยในโค้ดเบราว์เซอร์หรือตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_`
- ห้ามพิมพ์ลง log

## Storage

ค่าเริ่มต้นจัดเก็บไฟล์ชั่วคราวในเครื่อง โดย FastAPI ตรวจเจ้าของงานก่อน stream ไฟล์

หาก deployment ในอนาคตเปิดใช้ Supabase Storage ให้ตั้ง bucket เป็น private
ตัวอย่างรูปแบบ path:

```text
{user_id}/{job_id}/{filename}
```

ใช้ signed URL อายุสั้นสำหรับไฟล์บน cloud และห้ามบันทึกหรือส่งต่อ URL ดังกล่าว

## Checklist สำหรับตรวจทาน

- [ ] เปิด RLS บนทุกตารางที่มีข้อมูลผู้ใช้
- [ ] Select policy จำกัดแถวตามเจ้าของที่ล็อกอิน
- [ ] Browser client แก้ไขคิวงานหรือ policy log ที่ server จัดการไม่ได้
- [ ] การแก้ไขโปรไฟล์จำกัดเฉพาะผู้ใช้เจ้าของบัญชี
- [ ] service-role key อยู่เฉพาะบริการฝั่ง server ที่เชื่อถือได้
- [ ] Storage bucket ที่เปิดใช้เป็น private
- [ ] ไม่มีการบันทึก signed URL ลง log
- [ ] ตรวจเจ้าของหรือ guest session ก่อนส่งไฟล์
