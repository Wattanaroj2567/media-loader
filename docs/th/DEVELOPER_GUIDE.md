# คู่มือพัฒนาและผังสถาปัตยกรรมระบบ (Developer Onboarding & Architecture Guide)

> **ภาษา:** [English](../en/DEVELOPER_GUIDE.md) · **ภาษาไทย**

ยินดีต้อนรับสู่ศูนย์รวมเอกสารสำหรับนักพัฒนา (Developer Documentation Hub) ของโปรเจกต์ Media Loader คู่มือนี้สรุปข้อมูลสถาปัตยกรรม คำสั่ง เครื่องมือ และข้อกำหนดที่จำเป็นสำหรับการพัฒนาและต่อยอดระบบ

---

## 1. ผังสถาปัตยกรรมโปรเจกต์ (Project Architecture Overview)

Media Loader ถูกออกแบบในรูปแบบ Decoupled Monorepo:

```text
media-loader/
├── apps/
│   ├── web/                 # Next.js 16 Frontend (App Router, Tailwind, Drizzle)
│   ├── api/                 # FastAPI Backend Service (URL analysis & Policy engine)
│   └── worker/              # Python Media Worker (Queue listener, yt-dlp, FFmpeg)
├── apps/web/lib/db/
│   └── schema.ts            # แหล่งข้อมูลหลักของตารางและคอลัมน์แอปพลิเคชัน
├── supabase/
│   ├── rls_policies.sql     # นโยบาย Supabase Row Level Security
│   ├── profile_trigger.sql  # ฟังก์ชันและ Trigger สร้างโปรไฟล์จาก Auth
│   └── migrations/          # Migration เริ่มต้นในอดีต ห้ามเพิ่มการแก้ schema ใหม่ที่นี่
└── docs/                    # คู่มือสถาปัตยกรรมและข้อกำหนดทางเทคนิค
```

### การไหลของข้อมูลในระบบ (Data Flow Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor User as ผู้ใช้งาน
    participant Web as Web App (Next.js)
    participant API as FastAPI Backend
    participant DB as Supabase DB (Postgres)
    participant Worker as Media Worker (Python)
    participant Storage as Supabase Storage / Local Temp

    User->>Web: วาง URL สื่อที่ต้องการ
    Web->>API: POST /media/analyze (URL)
    API->>API: ตรวจสอบ SSRF & Policy
    API-->>Web: คืนค่ารายการฟอร์แมต & ข้อมูลเมตา
    User->>Web: เลือกฟอร์แมต ยืนยันสิทธิ์ และเข้าคิว
    Web->>API: POST /downloads
    API->>API: ตรวจ URL, Policy, Analysis และฟอร์แมตซ้ำ
    API->>DB: บันทึก Job (Status: QUEUED พร้อม Worker Pool)
    Worker->>DB: รับงาน QUEUED จาก Pool ของตน
    Worker->>Worker: ดาวน์โหลดและแปลงไฟล์ด้วย yt-dlp / FFmpeg
    Worker->>Storage: บันทึกผลลัพธ์ลง Local Temp / Optional Storage
    Worker->>DB: อัปเดตสถานะ Job (Status: COMPLETED)
    Web->>API: ขอรับไฟล์ผ่าน Endpoint ที่ตรวจสิทธิ์
    API->>User: Stream ไฟล์ของเจ้าของงาน
```

---

## 2. รวมคำสั่งสำคัญสำหรับนักพัฒนา (Developer Command Reference)

คำสั่งการพัฒนาหลักทั้งหมดสามารถรันได้โดยตรงจาก Root Directory ของโปรเจกต์ผ่าน `pnpm`:

### การจัดการสภาพแวดล้อมและ Dependencies

```bash
# คัดลอกแม่แบบไฟล์ Environment
cp .env.example .env.local

# ติดตั้ง Dependencies ของทั้ง Node.js และ Python ใน Monorepo
pnpm install
pnpm setup:py

# ตรวจสอบความถูกต้องของ Environment Variables โดยไม่พิมพ์รหัสลับออกมา
pnpm check-env
```

### การสั่งรันบริการ Local Development

```bash
# ค่าเริ่มต้น: เปิด Web, FastAPI แบบ reload และ Worker ใน Terminal เดียว
pnpm dev

# เหมือนกัน แต่เขียน log ทุกบริการลง tmp/dev.log (git-ignored)
# ให้ AI Agent มาตามอ่านทีหลังได้: pnpm dev:log
```

ใช้ `pnpm dev:web`, `pnpm dev:api` หรือ `pnpm dev:worker` เมื่อต้องการแยกตรวจ
เฉพาะบริการ หลังโค้ดนิ่งแล้วใช้ `pnpm docker:up` เพื่อตรวจ API/Worker ในสภาพ
production-like โดย Docker ไม่ใช่วงจรแก้โค้ดหลัก

### การทดสอบ (Testing)

```bash
# รัน Unit Tests ทุก Service
pnpm test:web       # ทดสอบ Frontend (Node test runner)
pnpm test:api       # ทดสอบ FastAPI (pytest)
pnpm test:worker    # ทดสอบ Media Worker (pytest)

# ทดสอบ E2E
pnpm test:e2e       # ทดสอบ Playwright Mock บน Frontend
pnpm test:api:e2e   # ทดสอบ E2E API/Worker ด้วย Python script
```

### การตรวจสอบคุณภาพโค้ด (Linting & Formatting)

```bash
# ตรวจสอบ Linting ทุก Service พร้อมกัน (ESLint + Ruff + Markdownlint)
pnpm lint

# หรือตรวจแยกเฉพาะส่วน:
pnpm lint:web       # Next.js (ESLint)
pnpm lint:api       # FastAPI (Ruff)
pnpm lint:worker    # Media Worker (Ruff)
pnpm lint:md        # Markdown files (markdownlint-cli2)
pnpm lint:md:fix    # Auto-fix Markdown formatting

# จัดรูปแบบโค้ดอัตโนมัติ (Prettier + Ruff Format)
pnpm format
pnpm format:web     # Prettier
pnpm format:api     # Ruff format
pnpm format:worker  # Ruff format
```

### การตรวจจับ Dead Code และไฟล์ที่ไม่ได้ใช้งาน (Dead Code Audit)

```bash
# ตรวจสอบ Dead Code ทั่วทั้ง Monorepo (Knip + Vulture)
pnpm deadcode

# ตรวจจับเฉพาะส่วน:
pnpm deadcode:web     # Next.js (Knip: ตรวจจับ Unused files/exports/dependencies)
pnpm deadcode:api     # FastAPI (Vulture: ตรวจจับ Unused functions/classes/variables)
pnpm deadcode:worker  # Worker (Vulture)
```

### การจัดการฐานข้อมูล (Drizzle ORM)

```bash
# Push การอัปเดต Schema ไปยัง Supabase / PostgreSQL
pnpm --filter web db:push
```

---

## 3. ดัชนีเอกสารทางเทคนิค (Documentation Index)

รายละเอียดเชิงลึกของแต่ละส่วนงานสามารถอ่านเพิ่มเติมได้ในไดเรกทอรี [`docs/`](docs):

| เอกสาร | วัตถุประสงค์และเนื้อหา |
| :--- | :--- |
| **[USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md)** | ขั้นตอนการขอรหัสผ่านและสร้างคีย์จาก Supabase & Google Cloud |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | สถาปัตยกรรมระบบโดยละเอียด ขอบเขตความปลอดภัย และการไหลของข้อมูล |
| **[API_SPEC.md](API_SPEC.md)** | ข้อกำหนด REST API Endpoints ของ FastAPI, Request Schemas และ Response Formats |
| **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** | โครงสร้างตารางฐานข้อมูล ความสัมพันธ์ โมเดลสถานะ และการตั้งค่า Drizzle ORM |
| **[SECURITY_AND_POLICY.md](SECURITY_AND_POLICY.md)** | กฎการตรวจสอบสิทธิ์, การป้องกัน SSRF และข้อกำหนดของ Policy Engine |
| **[SUPABASE_RLS_POLICY.md](SUPABASE_RLS_POLICY.md)** | นโยบาย Row Level Security (RLS) สำหรับแยกแยะข้อมูลผู้ใช้ |
| **[ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)** | รายการค่าแปรสภาพแวดล้อมทั้งหมดทั้งที่จำเป็นและตัวเลือกเสริม |
| **[GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)** | คู่มือการตั้งค่า Google OAuth ใน Supabase Dashboard |
| **[VERCEL_SETUP.md](VERCEL_SETUP.md)** | คู่มือการ deploy ส่วนของ Next.js Frontend ขึ้น Vercel |
| **[SECRETS_PROTOCOL.md](SECRETS_PROTOCOL.md)** | โปรโตคอลความปลอดภัยและการจัดการรหัสผ่านสำหรับนักพัฒนาและ AI Agent |

---

## 4. วงจรสถานะงาน (Status Model Lifecycle)

คิวงานใน Media Loader เปลี่ยนสถานะตามลำดับขั้นตอนดังนี้:

```text
PENDING ──> ANALYZING ──> READY ──> QUEUED ──> DOWNLOADING ──> CONVERTING ──> UPLOADING ──> COMPLETED

ทุกสถานะ ──> FAILED
ทุกสถานะ ──> BLOCKED
QUEUED / DOWNLOADING / CONVERTING ──> CANCELLED
```

---

## 5. กฎและแนวทางการพัฒนา (Development Rules)

1. **เครื่องมือจัดการ Package**:
   - ใช้ `pnpm` สำหรับ Node.js Packages และการรันสคริปต์ในโปรเจกต์เสมอ
   - ใช้ `uv` สำหรับการจัดการ Virtual Environment และรัน Python Scripts (`uv venv`, `uv pip install`, `uv run`) เสมอ
2. **การรักษาความลับ (Secrets Handling)**:
   - ห้ามพิมพ์หรือบันทึกรหัสผ่านลับลงใน Log หรือ Console (เช่น `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`)
   - ห้าม commit ไฟล์ `.env.local` ลงใน Git Repository
3. **การเคารพสิทธิ์และนโยบาย (Rights Compliance)**:
   - ห้ามเขียนโค้ดเพื่อข้ามระบบ DRM, Paywall หรือหน้าต่างล็อกอินของแพลตฟอร์มใดๆ
   - ทุก URL ต้องผ่านการตรวจสอบในชั้น Policy ก่อนวิเคราะห์หรือดาวน์โหลดเสมอ
