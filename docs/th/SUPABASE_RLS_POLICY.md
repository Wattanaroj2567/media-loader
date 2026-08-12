# คู่มือกำหนดสิทธิ์ความปลอดภัยระดับตาราง (Supabase RLS Policy Guide)

[English](SUPABASE_RLS_POLICY.md) | ภาษาไทย

คู่มืออธิบายการกำหนดนโยบาย Row Level Security (RLS) สำหรับปกป้องข้อมูลผู้ใช้ใน Media Loader

ไฟล์ SQL หลักสำหรับจัดการสิทธิ์ประกอบด้วย:
```text
supabase/schema.sql
supabase/rls_policies.sql
```

---

## กฎหลัก (Main Rule)

ข้อมูลที่เป็นของผู้ใช้ทุกคนต้องได้รับการปกป้องด้วยเงื่อนไข `user_id = auth.uid()` หรือ `id = auth.uid()`

ผู้ใช้งานแต่ละคนจะมีสิทธิ์เข้าถึงเฉพาะข้อมูลของตนเองเท่านั้น:
- โปรไฟล์ (Profile)
- คิวงานดาวน์โหลด (Download Jobs)
- รายการฟอร์แมตสื่อ (Media Formats)
- บันทึกนโยบายสิทธิ์ (Policy Logs)
- ไฟล์ใน Storage (เมื่อเปิดใช้งานโหมด Cloud)

---

## ตารางที่บังคับใช้ RLS (Tables Requiring RLS)

```text
profiles
download_jobs
policy_logs
```

ทุกตารางข้างต้นต้องเปิดใช้งาน RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`)

---

## รูปแบบนโยบายสิทธิ์ (Policy Pattern)

สำหรับตารางที่มีคอลัมน์ `user_id`:
```sql
USING (auth.uid() = user_id)
```

สำหรับตาราง `profiles` ที่ `id` อ้างอิงถึง `auth.users(id)`:
```sql
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id)
```

ตาราง `download_jobs` และ `policy_logs` ถูกบริหารจัดการผ่านฝั่ง Server-Side (FastAPI API และ Media Worker) Client บนเบราว์เซอร์จะมีสิทธิ์เพียงการอ่าน (`SELECT`) แถวข้อมูลของตนเองเท่านั้น โดยไม่มีสิทธิ์ `INSERT`, `UPDATE` หรือ `DELETE` โดยตรง FastAPI และ Worker จะปรับเปลี่ยนข้อมูลผ่าน Supabase Service Role Key บนเครื่อง Server ที่ปลอดภัย
