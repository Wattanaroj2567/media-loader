# ความปลอดภัยและนโยบายการใช้สื่อ

> **ภาษา:** [English](../en/SECURITY_AND_POLICY.md) · **ภาษาไทย**

## วัตถุประสงค์

โปรเจกต์ต้องคำนึงถึงสิทธิ์ในสื่อและความปลอดภัย ระบบต้องไม่กลายเป็นเครื่องมือ
ดาวน์โหลดที่ไม่จำกัดหรือข้ามระบบควบคุมการเข้าถึง

---

## ขอบเขตโค้ดปัจจุบัน

- API รับ HTTP และ HTTPS เฉพาะพอร์ต 80 และ 443 ตรวจ DNS ทั้ง IPv4 และ IPv6
  และบล็อก address ที่ไม่ใช่ public ก่อนวิเคราะห์และสร้างงาน
- API และ Worker ส่ง request ของ URL ต้นทางผ่าน `ssrf-proxy` โดย proxy จะ resolve
  ปลายทาง ปฏิเสธการเชื่อมต่อหากมี DNS answer ที่ไม่ใช่ public และเชื่อมต่อไปยัง
  numeric address ที่ตรวจแล้ว การตาม HTTP redirect จะกลับมาผ่าน proxy เพื่อให้
  ตรวจปลายทางใหม่ ส่วน HTTPS ใช้ CONNECT tunnel และ redirect ถัดไปจะเป็น request
  ใหม่ที่ต้องผ่านการตรวจอีกครั้ง
- Docker Compose แยก API และ Worker ออกจากอินเทอร์เน็ตโดยตรงและให้เชื่อมผ่าน proxy
  หาก deploy นอกเครือข่าย Compose ต้องมี public-IP egress proxy ที่ให้ผลเทียบเท่า
  และปิดทางออกเครือข่ายตรงของ API/Worker
- ระบบเข้ารหัส `download_jobs.original_url` ด้วย Fernet ก่อนเขียนฐานข้อมูล API
  และ Worker ต้องใช้ `MEDIA_URL_ENCRYPTION_KEY` ค่าเดียวกัน ส่วน `policy_logs.url`
  เก็บเฉพาะ origin โดยตัด path และ query ออก
- แถวเก่าที่เป็น plaintext ต้องย้ายด้วยคำสั่งครั้งเดียวใน
  [Environment Variables](ENVIRONMENT_VARIABLES.md) จนกว่าจะรันคำสั่งนี้
  URL เก่าในฐานข้อมูลยังคงเป็น plaintext
- API access log ตัดค่าทุก query ออก และ application log ใช้ job ID กับ source
  origin ที่ปลอดภัยโดยไม่บันทึก URL ที่ส่งมา
- เส้นทาง Giphy GIF โดยตรงยังตรวจว่า URL สุดท้ายอยู่บน Giphy และเป็น path ของ GIF
  และ egress proxy จะตรวจทุกปลายทางเครือข่ายด้วย
- Guest session ID และ file token อายุสั้นใช้เข้าถึงงานหรือไฟล์ของ Guest ได้
  ให้เก็บเป็น credentials
- โหมดจัดเก็บปัจจุบันคือ `local_temp` ยังไม่ได้พัฒนาการจัดเก็บและส่งไฟล์ผ่าน
  Supabase Storage ให้ครบ

## กฎหลัก

1. ตรวจสอบ URL ก่อนเชื่อมต่อเครือข่าย
2. ตรวจนโยบายก่อนวิเคราะห์สื่อ
3. แสดงผลการวิเคราะห์ให้ผู้ใช้ตรวจ แล้วขอการยืนยันสิทธิ์ก่อนสร้างงาน
4. บล็อก URL ที่ไม่รองรับหรือไม่ปลอดภัย
5. บันทึกผลการตัดสินนโยบายโดยไม่เก็บข้อมูลลับ
6. เก็บ secrets ไว้ฝั่ง server
7. ใช้ Supabase RLS กับข้อมูลผู้ใช้
8. จำกัดการเข้าถึงไฟล์ที่เสร็จแล้วตามเจ้าของ และลบไฟล์ชั่วคราวตามกำหนด

## ประเภท URL ที่ต้องบล็อก

บล็อก URL ต่อไปนี้เสมอ:

- `file://`
- `ftp://` เว้นแต่จะรองรับอย่างชัดเจนในอนาคต
- `localhost`
- `127.0.0.1`
- `0.0.0.0`
- ช่วง IP ส่วนตัว
- ช่วง IP แบบ link-local
- hostname ภายใน

## การป้องกัน SSRF

ก่อนส่งคำขอออกไปยังเครือข่าย:

- แยกวิเคราะห์ URL อย่างเข้มงวด
- อนุญาต HTTP/HTTPS เฉพาะพอร์ต 80 และ 443
- resolve DNS ทั้ง IPv4 และ IPv6 และปฏิเสธ hostname หากมี answer ที่ไม่ใช่ public
- เชื่อมต่อผ่าน SSRF proxy ซึ่งใช้ address ที่ตรวจแล้วในการเชื่อมต่อครั้งนั้น
- จำกัด protocol ที่อนุญาต
- ตรวจ redirect destination ทุกครั้งผ่าน proxy
- กำหนด timeout
- จำกัดขนาด response

## นโยบายแพลตฟอร์ม

ห้ามข้ามข้อจำกัดหรือระบบป้องกันของแพลตฟอร์ม ชั้น policy ควรตัดสินอย่างระมัดระวัง

ค่าการตัดสินที่ API ปัจจุบันส่งกลับ:

```text
allowed
needs_confirmation
blocked
```

Proxy ตรวจ DNS ในจังหวะเชื่อมต่อและ pin address เพื่อป้องกัน DNS rebinding
หาก deploy นอก Compose ต้องแน่ใจว่า API และ Worker ไม่มีทางเชื่อมต่อ URL ของผู้ใช้
โดยหลบ proxy ที่กำหนดไว้

หากไม่แน่ใจ ให้ตอบ `needs_confirmation` หรือ `blocked` แทน `allowed`

## โหมดจำกัดการทำงานของ yt-dlp

เมื่อใช้ yt-dlp:

- ห้ามใช้ browser cookies
- ห้ามข้ามข้อกำหนดการล็อกอิน
- ห้ามข้าม DRM
- ห้ามข้าม age gate
- ห้ามข้ามข้อจำกัดภูมิภาค
- ห้ามดาวน์โหลดสื่อส่วนตัว
- กำหนด timeout
- ควบคุม output path
- ทำความสะอาดชื่อไฟล์

## ความปลอดภัยของไฟล์

- บังคับใช้ขนาดไฟล์สูงสุด
- ตรวจเนื้อหาสื่อก่อนยอมรับไฟล์ผลลัพธ์
- ตรวจนามสกุลไฟล์
- เก็บไฟล์ไว้ใน local temp path ที่ควบคุมได้โดยค่าเริ่มต้น
- ตรวจและ resolve local path ก่อนส่งไฟล์
- ห้ามรันไฟล์ที่ดาวน์โหลดมา
- ทำความสะอาดชื่อไฟล์
- ลบไฟล์ชั่วคราวตามกำหนด

## ความปลอดภัยของ Supabase

- เปิด RLS บนตารางที่มีข้อมูลผู้ใช้
- ผู้ใช้เข้าถึงได้เฉพาะข้อมูลของตน
- service-role key อยู่เฉพาะฝั่ง API หรือ Worker
- เก็บ Bucket ของ Storage ในอนาคตเป็น private; ปัจจุบันยังไม่ได้พัฒนาการจัดเก็บไฟล์บน Cloud ให้ครบ
- ส่งไฟล์ local temp ผ่าน FastAPI โดยใช้ Bearer token, guest session ของเจ้าของงาน
  หรือ file token อายุสั้น
- หลีกเลี่ยง public bucket สำหรับไฟล์สื่อของผู้ใช้

## กฎการบันทึก log

บันทึกได้:

- Job ID
- สถานะ
- domain หรือ platform ที่ปลอดภัย
- error code ที่ไม่เปิดเผยข้อมูลลับ

ห้ามบันทึก:

- secrets
- access tokens
- URL เต็มที่ผู้ใช้ส่งมาหรือ query string
- local temp output paths หากไม่จำเป็น
- service-role key
- private keys ของผู้ใช้

ฐานข้อมูลเก็บ URL ของงานในรูปแบบเข้ารหัสระหว่างที่ยังต้องใช้ประมวลผล ส่วน policy
log เก็บเฉพาะ source origin ที่ปกปิดแล้ว ก่อนเปิด deployment เดิมให้ผู้ใช้ร่วมกัน
ให้รันคำสั่งย้ายข้อมูล plaintext เดิม

## ข้อความแจ้งข้อผิดพลาดที่ปลอดภัย

ตัวอย่างที่เหมาะสม:

```text
This URL is blocked because it points to an internal network address.
```

ตัวอย่างที่ไม่เหมาะสม:

```text
Request to 192.168.1.1 returned private server headers: ...
```

## Checklist ความปลอดภัย

- [ ] ข้ามขั้นตอน policy check ไม่ได้
- [ ] Worker รับเฉพาะงานที่ API สร้างเข้าคิว
- [ ] ไม่มีการพิมพ์ secrets ลง log
- [ ] ลบหรือปกปิด URL ที่ส่งมาและ query values ออกจาก application logs
- [ ] เข้ารหัส URL งานในฐานข้อมูลและตั้ง encryption key เดียวกันให้ API กับ Worker
- [ ] ตรวจ redirect destination และ DNS rebinding ที่ egress proxy
- [ ] ปิดทางออกเครือข่ายตรงของ API และ Worker ที่หลบ proxy ได้
- [ ] service-role key ไม่อยู่ใน frontend
- [ ] เปิดใช้ RLS
- [ ] ปิด cloud-file storage ไว้จนกว่าจะพัฒนาและรักษาความปลอดภัยครบ
- [ ] มีการป้องกัน SSRF
- [ ] ไม่มีการข้ามข้อจำกัดของแพลตฟอร์ม
