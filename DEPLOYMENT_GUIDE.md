# คู่มือการนำ Student Finance Tracker ขึ้นออนไลน์ (Cloud Deployment Guide)

โปรเจกต์นี้ได้รับการปรับแต่งสถาปัตยกรรมให้สามารถ Deploy ขึ้น Cloud Hosting ฟรีเป็น **Single Web Service (เว็บแอปพร้อม API ในบริการเดียว)** โดย FastAPI จะทำหน้าที่เสิร์ฟทั้ง REST API และหน้าเว็บ React SPA ไปพร้อมกัน ทำให้:
- **ใช้โควตาฟรี 1 Service เท่านั้น** ไม่ต้องแยก Frontend / Backend
- **ไม่มีปัญหาเรื่อง CORS** เพราะอยู่บนโดเมนเดียวกัน
- **เชื่อมต่อ Webhook ของ LINE ได้ทันที** ด้วย HTTPS URL สาธารณะที่ได้จากโฮสต์

---

## ตัวเลือกที่ 1: Deploy บน Render.com (ฟรี ไม่ต้องใช้บัตรเครดิต - แนะนำ ⭐)

Render มี Free Tier สำหรับ Web Service ที่รองรับ Docker และมีเซิร์ฟเวอร์ Region สิงคโปร์ (Singapore) ซึ่งอยู่ใกล้ไทยและตอบสนองได้รวดเร็ว

### ขั้นตอนที่ 1: นำโค้ดขึ้น GitHub
เนื่องจาก Cloud Hosting จะดึงโค้ดจาก GitHub ไป Build อัตโนมัติ:
1. ไปที่ [github.com](https://github.com/) เข้าสู่ระบบ และกดสร้าง **New Repository** (เช่น ตั้งชื่อ `student-finance-tracker`)
2. นำโฟลเดอร์โปรเจกต์นี้ขึ้น GitHub:
   - **วิธีที่ง่ายที่สุด (ผ่านแอป):** ใช้ [GitHub Desktop](https://desktop.github.com/) เลือก `Add Existing Repository` ชี้มาที่ `d:\miniproject` แล้วกด `Publish repository`
   - หรือติดตั้ง Git จาก [git-scm.com](https://git-scm.com/) แล้วรันคำสั่ง:
     ```bash
     git init
     git add .
     git commit -m "Initial commit - Student Finance Tracker"
     git branch -M main
     git remote add origin https://github.com/USERNAME/student-finance-tracker.git
     git push -u origin main
     ```

### ขั้นตอนที่ 2: สร้าง Web Service บน Render
1. ไปที่ [render.com](https://render.com/) และล็อกอินด้วยบัญชี GitHub
2. กดปุ่ม **New +** ที่มุมขวาบน แล้วเลือก **Web Service**
3. เลือก Repository `student-finance-tracker` ที่เพิ่งอัปโหลด
4. ตั้งค่าดังนี้:
   - **Name:** `student-finance-tracker` (หรือชื่อที่ต้องการ โดเมนจะกลายเป็น `https://ชื่อคุณ.onrender.com`)
   - **Region:** `Singapore (Southeast Asia)`
   - **Runtime:** `Docker` (ระบบจะตรวจพบ `Dockerfile` ที่เตรียมไว้ให้อัตโนมัติ)
   - **Instance Type:** `Free` ($0/month)
5. ในหัวข้อ **Environment Variables** ให้เพิ่มตัวแปรเหล่านี้:
   - `APP_ENV` = `production`
   - `DATABASE_URL` = `sqlite:///./data/finance.db`
   - `LINE_MOCK_MODE` = `true` (หรือ `false` หากต้องการใช้ LINE Bot จริง)
   - `OCR_PROVIDER` = `mock` (หรือ `ocr_space` หากมี API Key)
   - `SEED_DEMO_DATA` = `true`
6. กดปุ่ม **Deploy Web Service**
7. รอ Render ทำการ Build ประมาณ 2-3 นาที เมื่อเสร็จแล้วจะแสดงสถานะ **Live** สีเขียว พร้อม URL เช่น `https://student-finance-tracker-xxxx.onrender.com`

> [!TIP]
> **การเชื่อมต่อ LINE Bot จริง:**
> หากต้องการเชื่อมต่อกับ LINE Developers ให้นำ URL ที่ได้จาก Render ไปเติมต่อท้ายด้วย `/api/line/webhook` เช่น:
> `https://student-finance-tracker-xxxx.onrender.com/api/line/webhook`
> แล้วนำไปวางในช่อง Webhook URL บน LINE Developers Console ได้เลย

---

## ตัวเลือกที่ 2: Deploy บน Railway.app

1. ไปที่ [railway.app](https://railway.app/) ล็อกอินด้วย GitHub
2. กด **New Project** -> **Deploy from GitHub repo**
3. เลือก Repository ของคุณ Railway จะอ่าน `Dockerfile` และ Deploy ให้อัตโนมัติทันที
4. เข้าไปที่แท็บ **Settings** -> หัวข้อ **Networking** แล้วกด **Generate Domain** เพื่อรับ Public HTTPS URL

---

## ตัวเลือกที่ 3: เปิดให้เพื่อน/อาจารย์เข้าดูจากเครื่องนี้ทันที (ผ่าน Cloudflare Tunnel)

หากต้องการเปิดลิงก์ให้คนอื่นเข้าใช้งานเดี๋ยวนี้ โดยไม่ต้องสร้างบัญชีโฮสติ้งและไม่ต้องอัปโหลดขึ้น GitHub:
1. ดาวน์โหลด [Cloudflared for Windows](https://github.com/cloudflare/cloudflared/releases) (ไฟล์ `.exe`)
2. เปิด PowerShell แล้วรันคำสั่ง:
   ```powershell
   cloudflared.exe tunnel --url http://localhost:8000
   ```
3. Cloudflare จะสร้าง Public HTTPS URL ชั่วคราวให้ทันที เช่น:
   `https://random-name.trycloudflare.com`
4. คุณสามารถส่งลิงก์นี้ให้อาจารย์ เพื่อน หรือนำไปใส่ใน LINE Webhook URL ได้ทันทีตราบใดที่เครื่องคอมพิวเตอร์ของคุณยังเปิดโปรแกรมอยู่
