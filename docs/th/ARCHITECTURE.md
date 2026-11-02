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

ดูภาพสถาปัตยกรรมฉบับ[ภาษาไทย](../images/media-loader-architecture-th.png)
หรือ [English](../images/media-loader-architecture-en.png) โดยอ่านตามลำดับเลข
ตั้งแต่กรอก URL จนส่งไฟล์ให้เจ้าของงาน ส่วนแถบด้านล่างแสดงเส้นทางผ่าน proxy
สำหรับคำขอไปยังแหล่งสื่อต้นทาง

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

### การยืนยันตัวตน

```text
ผู้ใช้ → Next.js → Supabase Auth → Dashboard
```

คำขอ API ของผู้ใช้ที่ล็อกอินจะส่ง Supabase access token ปัจจุบัน

Supabase Auth เป็นผู้จัดการบัญชีและ session เว็บแอปรองรับการเข้าสู่ระบบด้วย
email/password ที่ `/auth/login` และสมัครสมาชิกที่ `/auth/register`
ชื่อที่แสดงเป็นข้อมูลเสริมใน metadata `full_name` ไม่ใช่ username สำหรับล็อกอิน
การสมัครด้วยอีเมลจะบันทึกภาษาที่เลือกใน user metadata ชื่อ `language` เมื่อเปลี่ยน
ภาษาในหน้าเว็บ ระบบบันทึกไว้ใน localStorage และ cookie อายุหนึ่งปี เมื่อเข้าสู่ระบบด้วยรหัสผ่านหรือ
callback สำเร็จ ระบบ sync ค่าภาษาของบัญชีจาก cookie และใช้ภาษาไทยเมื่อ cookie ไม่มี
หรือค่าไม่ถูกต้อง ส่วน database trigger เดิมสร้าง profile หากสมัครแล้วได้ session
ระบบเปิด `/dashboard` หากต้องยืนยันอีเมล หน้าสมัครจะแจ้งให้ตรวจอีเมลก่อน

ทั้งสองหน้ามี Google sign-in โดย callback ของ Google และอีเมลกลับมาที่
`/auth/callback` เพื่อแลก authorization code เป็น Supabase session ปลายทาง
`next` ต้องเป็น same-origin และอยู่ในรายการ `/dashboard`, `/history`,
`/settings`, `/downloads` หรือ `/auth/reset-password` เท่านั้น ระบบตัด query
และ fragment ออก และใช้ `/dashboard` หากปลายทางไม่ผ่าน เมื่อ callback ล้มเหลว
หน้าล็อกอินหรือกู้รหัสผ่านจะแสดงข้อผิดพลาดที่ปลอดภัย

### กู้รหัสผ่านและออกจากระบบ

`/auth/forgot-password` ขออีเมลกู้รหัสผ่านและแสดงข้อความยืนยันแบบกลางเหมือนกัน
ทุกครั้ง รวมถึงเมื่อ provider ล้มเหลว ลิงก์อีเมลกลับผ่าน
`/auth/callback?next=/auth/reset-password` ต้องเปิดใน browser ที่ใช้ขอกู้รหัสผ่าน
เพื่อให้ PKCE exchange ใช้ verifier ของ browser นั้นได้ redirect สำหรับกู้รหัสผ่าน
มีเฉพาะ `next=/auth/reset-password` และไม่ส่ง locale ใน query แอปไม่ได้เลือกภาษา
ให้แม่แบบอีเมลที่ตั้งค่าใน Supabase

`/auth/reset-password` ตรวจ authenticated session ก่อนเปลี่ยนรหัสผ่าน
เมื่อเปลี่ยนสำเร็จ ระบบสั่ง global sign-out และเปิด `/auth/login?reset=success`
ด้วย full navigation หาก sign-out ล้มเหลวหลังเปลี่ยนรหัสแล้ว การลองใหม่จะสั่ง
sign-out เท่านั้น ไม่เปลี่ยนรหัสผ่านซ้ำ

`POST /auth/signout` เรียก Supabase sign-out ทุกครั้ง เมื่อสำเร็จ redirect ไป `/`
ด้วยสถานะ `303` หาก provider ล้มเหลวจะตอบ `503` พร้อม error code ที่ปลอดภัย
และไม่รายงานว่าออกจากระบบสำเร็จ

### การเข้าถึงหน้าและการตั้งค่า provider

Middleware ส่งผู้ที่ไม่ล็อกอินจาก `/dashboard`, `/history`, `/downloads` และ
`/settings` กลับ `/` ส่วนผู้ที่ล็อกอินแล้วเปิด `/`, `/auth/login`,
`/auth/register` หรือ `/auth/forgot-password` จะไป `/dashboard` หน้ากู้รหัสผ่าน
ยังเข้าถึงได้และยังแสดง callback error โดยรักษา session cookies เมื่อ redirect

หน้า `/contact` เป็นหน้าฟอร์มติดต่อเพียงหน้าเดียว ครอบคลุมเรื่องบัญชีและการใช้งาน
ข้อกำหนดหรือสิทธิ์การใช้สื่อ และคำขอเกี่ยวกับข้อมูลส่วนบุคคล ลิงก์จากหน้า Privacy
และ Terms จะเลือกหัวข้อที่ตรงกันไว้ล่วงหน้า ฟอร์มตรวจข้อมูลใน browser แล้วเปิด
แอปอีเมลพร้อมข้อความ `mailto:` ให้ผู้ใช้ตรวจและกดส่ง โดยไม่ได้ส่งข้อความเข้า
application server หน้านี้ยังแสดงอีเมลผู้ดูแลสำหรับติดต่อโดยตรงด้วย

เปิด Email/Password และ Google provider ใน Supabase dashboard และเพิ่ม redirect
URL ต่อไปนี้ใน allowlist ให้ตรงกับแต่ละ web origin (เปลี่ยน origin ตัวอย่างเป็น
origin ที่ deploy จริง):

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/callback?next=/auth/reset-password`

ต้องตั้งค่า provider ผ่าน dashboard ด้วยตนเอง Flow คือวางลิงก์ กดเข้าสู่ระบบ
ล็อกอิน กลับมาพร้อมลิงก์เดิม วิเคราะห์ เลือกไฟล์ กดยืนยันสิทธิ์ แล้วเข้าคิว
ระบบจำลิงก์ใน session storage ของแท็บเดิม ไม่ใส่ URL ต้นทางใน query ของ redirect

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

ต้องยืนยันบัญชีก่อนตรวจ policy หรือร้องขอข้อมูลต้นทาง
ระบบผูกผลการตัดสินนโยบายกับบัญชีที่ตรวจแล้ว

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

งานใหม่ผูกกับ `user_id` ของบัญชีที่ตรวจแล้ว งานผู้เยี่ยมชมเดิมยังเข้าถึงได้
เมื่อเป็นเจ้าของ แต่ resume โดยไม่ล็อกอินไม่ได้ ในโหมด local temp ต้องกำหนด pool ให้ถูกต้อง
เพื่อไม่ให้ Worker รับงานเมื่อแชร์ filesystem กับ API ไม่ได้

ตัวเลือกคุณภาพวิดีโอแสดงขนาดผลลัพธ์โดยประมาณ ไม่ใช่เฉพาะขนาดแทร็กวิดีโอต้นทาง
สำหรับ format ที่แยกแทร็กเสียง ค่าประมาณรวมเสียง AAC 320 kbps ที่ Worker รวมลง MP4
แล้ว แต่การแปลงยังทำให้ขนาดสุดท้ายเปลี่ยนได้ การประมวลผลมีการส่งข้อมูลสองช่วง:
Worker รับสื่อต้นทางมาเก็บชั่วคราวบนเซิร์ฟเวอร์ แล้วเว็บแอปส่งไฟล์ผลลัพธ์ให้
เบราว์เซอร์ของผู้ใช้หนึ่งครั้ง นี่ไม่ใช่การดาวน์โหลดลงเบราว์เซอร์สองรอบ และไฟล์
ต้นฉบับไม่ได้ถูกส่งลงอุปกรณ์ของผู้ใช้ก่อน บริการบางแห่งอาจให้เบราว์เซอร์รับไฟล์
จากต้นทางโดยตรง หรือส่งข้อมูลผ่านเซิร์ฟเวอร์เป็นสตรีมเดียว จึงเห็นรายการดาวน์โหลด
ในเบราว์เซอร์เพียงรายการเดียว หน้าจออย่างเดียวไม่ยืนยันว่าไฟล์ผ่านเซิร์ฟเวอร์หรือ
ถูกแปลงหรือไม่ Media Loader ให้ Worker เตรียมไฟล์ผลลัพธ์บนเซิร์ฟเวอร์ให้เสร็จ
ก่อนส่งให้ผู้ใช้ เพื่อให้ติดตามคิว เลือกรูปแบบ และกลับมาดาวน์โหลดจากประวัติได้

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
Next.js แล้ว stream ข้อมูลจาก FastAPI งานผู้เยี่ยมชมเดิมขอ download token อายุสั้น
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
- การ์ดคิวบนมือถือใช้ภาพปกเต็มความกว้างอัตราส่วน 16:9 และใช้ขนาด 96 × 54 px
  ตั้งแต่ breakpoint หน้าจอเล็กขึ้นไป พร้อมวันที่และเวลาที่เพิ่มคิวตาม locale
  ส่วนการ์ดประวัติแสดงวันที่ดาวน์โหลด และหน้าดูสื่อวางปุ่มปิดไว้ที่มุมขวาบน
  บนมือถือ ผู้ใช้เปิด Web Push เพื่อรับแจ้งเตือนสถานะงานของบัญชีเมื่องานสำเร็จ
  ล้มเหลว หรือถูกบล็อกผ่าน Service Worker แม้ปิดเว็บแอปแล้ว บน iPhone/iPad ต้องเพิ่ม
  Media Loader ไปยังหน้าจอโฮมและอนุญาตการแจ้งเตือน เมื่อเปิดการแจ้งเตือนที่ดาวน์โหลด
  สำเร็จ ระบบจะแจ้งว่างานจากต้นทางพร้อมบันทึก แสดงชื่อคลิป พาไปยังรายการนั้นในหน้าประวัติ และแนะนำวิธีบันทึกไฟล์
  หากปิดหน้าต่างบันทึก ระบบยังเก็บความคืบหน้าของไฟล์ไว้ให้ flow บันทึกอื่นใน session เดียวกัน
  ส่วนการเปิดหน้าใหม่ทั้งหมดจะดึงไฟล์ผลลัพธ์เดิมจากงานที่เสร็จแล้วมาเตรียมบันทึกอีกครั้ง
- ส่งไฟล์ผ่าน same-origin route ที่ตรวจ session สำหรับผู้ใช้ที่ล็อกอิน

### FastAPI

- ตรวจสอบ URL และตัดสินนโยบาย
- วิเคราะห์ metadata และส่งรายการ format
- สร้างงานใหม่ตามบัญชีและตรวจเจ้าของเมื่อจัดการงานผู้เยี่ยมชมเดิม
- ตรวจเจ้าของก่อนส่งหรือลบไฟล์ local
- ลบบัญชีผู้ใช้
- เข้ารหัส URL ก่อนบันทึกงาน และส่ง request ต้นทางผ่าน egress proxy

### Worker

- รับงานตาม worker pool ที่กำหนด
- ประมวลผลสื่อและอัปเดตความคืบหน้า
- เขียนไฟล์ลง local temp storage ที่แชร์กับ API
- ลบไฟล์ชั่วคราวที่หมดอายุ
- ถอดรหัส URL จากคิวและส่ง request ต้นทางผ่าน proxy
- ส่งการแจ้งเตือนเมื่อ job เข้าสถานะสุดท้ายไปยัง Web Push endpoint ที่ตรวจสอบแล้วผ่าน egress proxy

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

แถวงานใหม่จำกัดด้วย `user_id` งานผู้เยี่ยมชมเดิมมี `user_id`
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
- จำกัดงานใหม่และไฟล์ตามเจ้าของที่ล็อกอิน และตรวจเจ้าของของ guest session เดิม
- ห้ามเปิดเผย service-role key ในโค้ดเบราว์เซอร์
- ใช้ `local_temp` สำหรับไฟล์ผลลัพธ์; การจัดเก็บและส่งไฟล์ผ่าน Cloud Object Storage ยังทำไม่ครบ
