# Media Loader

<p align="center">
  <img src="apps/web/public/brand/media-loader-mark.svg" alt="โลโก้ Media Loader" width="112">
</p>

<p align="center"><strong>ประมวลผลสื่อสำหรับใช้งานส่วนบุคคลโดยเคารพสิทธิ์</strong></p>

<p align="center">
  วิเคราะห์ URL สื่อที่รองรับ ตรวจสอบรูปแบบไฟล์ คิวงานที่ได้รับอนุญาต
  และจัดการไฟล์ที่ประมวลผลเสร็จแล้วผ่านเว็บแอปเดียว
</p>

<p align="center">
  <a href="docs/th/DEVELOPER_GUIDE.md">คู่มือนักพัฒนา</a> ·
  <a href="docs/th/ARCHITECTURE.md">สถาปัตยกรรม</a> ·
  <a href="docs/th/CLOUDFLARE_DEPLOYMENT_GUIDE.md">การติดตั้ง</a> ·
  <a href="SECURITY.md">ความปลอดภัย</a>
</p>

<p align="center"><a href="README.md">English</a> · <strong>ภาษาไทย</strong></p>

---

## ภาพรวม

Media Loader เป็นเว็บแอปสำหรับวิเคราะห์ URL สื่อที่เข้าเงื่อนไขและจัดการงาน
ประมวลผลที่ผู้ใช้มีสิทธิ์ดำเนินการ เว็บแอปส่งคำขอไปยัง API ที่ตรวจสอบนโยบาย
ส่วน Worker แยกต่างหากรับผิดชอบงานประมวลผลสื่อ โดยใช้ Supabase สำหรับการยืนยันตัวตน
และจัดเก็บข้อมูลใน PostgreSQL

ระบบทำงานตามลำดับที่คำนึงถึงสิทธิ์:

```text
กรอก URL → ตรวจสอบความถูกต้อง → ตรวจสอบนโยบาย → วิเคราะห์ → ยืนยันสิทธิ์ → เข้าคิว → Worker
```

## หลักการ

- **เคารพสิทธิ์และมาตรการควบคุมการเข้าถึง** ประมวลผลเฉพาะสื่อที่คุณมีสิทธิ์
  และไม่ข้าม DRM, หน้าเข้าสู่ระบบ หรือมาตรการป้องกันอื่น
- **แยกหน้าที่ของแต่ละบริการ** API ตรวจสอบ URL และนโยบาย, Worker ประมวลผลสื่อ
  และเว็บแอปทำหน้าที่แสดงส่วนติดต่อผู้ใช้
- **ปกป้องข้อมูลผู้ใช้** การทำงานของบัญชีที่เข้าสู่ระบบจะจำกัดขอบเขตตามผู้ใช้
  โดยมี Row Level Security (RLS) ของ PostgreSQL ช่วยแยกข้อมูล URL งานจะถูกเข้ารหัส
  ในฐานข้อมูล และ request ต้นทางจะส่งผ่าน egress proxy ที่ตรวจสอบปลายทาง

## สถาปัตยกรรม

ภาพนี้แสดงการติดตั้งแบบ Cloudflare ระดับ 1B อ่านตามเลข **1–7** ตั้งแต่กรอกลิงก์
จนบันทึกไฟล์ที่เสร็จแล้ว ส่วนแถบด้านล่าง
แสดงเส้นทางที่ API และ Worker ใช้เข้าถึงแหล่งสื่อสาธารณะผ่าน egress proxy
ที่ตรวจสอบปลายทาง

<p align="center">
  <a href="docs/images/media-loader-architecture-th.png">
    <img src="docs/images/media-loader-architecture-th.png" alt="Cloudflare ระดับ 1B ใน 7 ขั้น ได้แก่ เข้าสู่ระบบบนเว็บ Cloudflare Workers วิเคราะห์ URL ผ่าน Cloudflare Tunnel และ FastAPI ยืนยันสิทธิ์ เข้าคิว Supabase ประมวลผลด้วย Docker worker อัปโหลดเข้า R2 แบบส่วนตัว และโหลดตรงจาก R2 หลังตรวจเจ้าของงาน" width="100%">
  </a>
</p>

<p align="center">
  <a href="docs/images/media-loader-architecture-th.png">ดูภาพภาษาไทยขนาดเต็ม</a> ·
  <a href="docs/images/media-loader-architecture-en.png">View English image</a>
</p>

ในระดับ 1B เว็บแอปอยู่บน Cloudflare Workers และเข้าถึง FastAPI บน Docker
ผ่าน Cloudflare Tunnel ส่วน Docker worker อัปโหลดไฟล์ที่เสร็จแล้วเข้า R2 แบบส่วนตัว
FastAPI ตรวจเจ้าของงานและออก presigned URL อายุสั้นให้เบราว์เซอร์ดาวน์โหลดตรงจาก R2

<details>
<summary>รายละเอียดองค์ประกอบของระบบ</summary>

| องค์ประกอบ    | หน้าที่                                           | การนำไปใช้งาน                                 |
| ------------- | ------------------------------------------------- | --------------------------------------------- |
| `apps/web`    | เว็บแอป Next.js                                   | Cloudflare Workers ผ่าน vinext                |
| `apps/api`    | วิเคราะห์ URL ตรวจสอบนโยบาย และสร้างงาน           | โฮสต์แยกใน container                          |
| `apps/worker` | ตรวจคิวและประมวลผลสื่อด้วย yt-dlp และ FFmpeg      | โฮสต์ Backend บน Docker                       |
| `apps/proxy`  | Public-IP egress proxy สำหรับ request ต้นทาง      | เครือข่าย Backend แบบ private                 |
| `supabase`    | การยืนยันตัวตน, PostgreSQL และ Row Level Security | Supabase                                      |
| R2            | เก็บไฟล์ชั่วคราวแบบส่วนตัวและส่งตรงให้เบราว์เซอร์   | Cloudflare R2                                 |

</details>

## เริ่มต้นใช้งาน

### สิ่งที่ต้องเตรียม

- Node.js 22.13 ขึ้นไป และ pnpm 11 ขึ้นไป
- Python 3.12 และ `uv`
- FFmpeg
- การตั้งค่าโปรเจกต์ Supabase สำหรับบริการที่ต้องการใช้งาน

### ติดตั้ง dependencies

รันคำสั่งต่อไปนี้จากไดเรกทอรีหลักของ repository:

```bash
pnpm install
pnpm setup:py
```

### ตั้งค่าสภาพแวดล้อม

สร้างไฟล์สภาพแวดล้อมในเครื่องจากไฟล์ตัวอย่าง และกำหนดค่าตาม
[คู่มือตัวแปรสภาพแวดล้อม](docs/th/ENVIRONMENT_VARIABLES.md)

```bash
pnpm env:sync
```

การรันครั้งแรกจะคัดลอก `.env.example` เป็น `.env.local` เมื่อ `.env.example` มีตัวแปรใหม่
ให้รันซ้ำได้ทุกเมื่อ คำสั่งจะเพิ่มเฉพาะตัวแปรที่ขาดต่อท้ายไฟล์ โดยไม่แก้ไขหรือแสดงค่าเดิมของคุณ
ใช้ `pnpm env:sync --dry-run` เพื่อดูตัวอย่าง หรือ `pnpm env:sync --check` เพื่อให้คำสั่งล้มเหลวเมื่อมีตัวแปรขาด

ตรวจสอบการตั้งค่าด้วย `pnpm check-env` และเก็บไฟล์สภาพแวดล้อมในเครื่องกับข้อมูลรับรอง
ให้พ้นจาก version control ตั้ง `MEDIA_URL_ENCRYPTION_KEY` เป็น Fernet key
ค่าเดียวกันให้ API และ Worker และกำหนด `MEDIA_EGRESS_PROXY` ตามคู่มือ environment

### เริ่มระบบ

เปิดเว็บแอป API, Worker และ egress proxy จากไดเรกทอรีหลัก:

```bash
pnpm dev
```

เว็บแอปจะทำงานที่ `http://localhost:3000` และ API ที่ `http://localhost:8000`
ดูคำสั่งและรายละเอียดการตั้งค่าแยกตามบริการได้ใน
[คู่มือนักพัฒนา](docs/th/DEVELOPER_GUIDE.md)

## คำสั่งสำหรับพัฒนา

| คำสั่ง             | การทำงาน                                                       |
| ------------------ | -------------------------------------------------------------- |
| `pnpm dev`         | เริ่มเว็บแอป API, Worker และ egress proxy สำหรับพัฒนาในเครื่อง |
| `pnpm dev:web`     | เริ่มเฉพาะเว็บแอป Next.js                                      |
| `pnpm dev:api`     | เริ่มเฉพาะบริการ FastAPI                                       |
| `pnpm dev:worker`  | เริ่มเฉพาะ Media Worker                                        |
| `pnpm dev:proxy`   | เริ่มเฉพาะ SSRF egress proxy ที่ `127.0.0.1:3128`              |
| `pnpm lint`        | ตรวจ lint ทั่วทั้ง repository                                  |
| `pnpm deadcode`    | ตรวจหาโค้ดที่ไม่ได้ใช้งาน                                      |
| `pnpm build`       | สร้าง build ของเว็บแอป Next.js                                 |
| `pnpm test:web`    | รันทดสอบเว็บแอป                                                |
| `pnpm test:api`    | รันทดสอบ API                                                   |
| `pnpm test:worker` | รันทดสอบ Worker                                                |
| `pnpm test:proxy`  | รันทดสอบ egress proxy                                          |

## เอกสาร

- [คู่มือเริ่มต้นใช้งาน](docs/th/USER_SETUP_GUIDE.md)
- [คู่มือนักพัฒนา](docs/th/DEVELOPER_GUIDE.md)
- [สถาปัตยกรรมระบบ](docs/th/ARCHITECTURE.md)
- [ข้อกำหนด API](docs/th/API_SPEC.md)
- [โครงสร้างฐานข้อมูล](docs/th/DATABASE_SCHEMA.md)
- [นโยบายความปลอดภัยและการใช้สื่อ](docs/th/SECURITY_AND_POLICY.md)
- [นโยบาย Row Level Security ของ Supabase](docs/th/SUPABASE_RLS_POLICY.md)
- [ตัวแปรสภาพแวดล้อม](docs/th/ENVIRONMENT_VARIABLES.md)
- [คู่มือตั้งค่า Google OAuth](docs/th/GOOGLE_OAUTH_SETUP.md)
- [แนวทางจัดการข้อมูลลับ](docs/th/SECRETS_PROTOCOL.md)
- [การติดตั้งบน Cloudflare Workers และ R2](docs/th/CLOUDFLARE_DEPLOYMENT_GUIDE.md)
- [การตั้งค่า Cloudflare Tunnel](docs/th/CLOUDFLARE_TUNNEL_GUIDE.md)
- [แนวทางการร่วมพัฒนา (ภาษาอังกฤษ)](CONTRIBUTING.md)
- [นโยบายความปลอดภัย (ภาษาอังกฤษ)](SECURITY.md)
- [MIT License](LICENSE)

## การใช้งานอย่างรับผิดชอบ

ใช้ Media Loader กับสื่อที่คุณได้รับอนุญาตให้ประมวลผลเท่านั้น และปฏิบัติตาม
กฎหมายกับเงื่อนไขการให้บริการของแพลตฟอร์มที่เกี่ยวข้อง แอปไม่ใช้ browser cookies
เพื่อเข้าถึงเนื้อหาที่จำกัดสิทธิ์ และไม่มีฟังก์ชันสำหรับข้ามมาตรการป้องกัน
