# Student Finance Tracker

เว็บแอปบันทึกรายรับรายจ่ายสำหรับนักศึกษา รองรับการส่งรูปสลิปเข้า LINE Bot หรืออัปโหลดสลิปบนเว็บโดยตรง จากนั้นระบบจะอ่านข้อความในรูปด้วย OCR แล้วนำมาให้ผู้ใช้ตรวจทานและยืนยันก่อนบันทึกลงบัญชี

> [!NOTE]
> ระบบนี้**ไม่อ่านประวัติธนาคาร** และ**ไม่ได้ยืนยันว่ามีการโอนเงินจริง** เป็นเพียงเครื่องมือช่วยอ่านข้อความจากรูปสลิปที่ผู้ใช้ส่งเข้ามา เพื่อความสะดวกในการบันทึกรายรับรายจ่ายเท่านั้น

---

## จุดเด่นและฟีเจอร์หลัก (Features)

1. **Dashboard สรุปภาพรวมการเงิน**:
   - การ์ดสถิติ: รายรับ รายจ่าย ยอดคงเหลือสุทธิ และจำนวนสลิปรอตรวจสอบ
   - แถบแสดงสัดส่วนค่าใช้จ่ายตามหมวดหมู่ (อาหาร, เดินทาง, การเรียน, ที่พัก, ช้อปปิ้ง, อื่น ๆ)
   - แถบประเมินสุขภาพการเงินและอัตราส่วนค่าใช้จ่ายต่องบประมาณของนักศึกษา
   - ปุ่มทางลัด Quick Actions สำหรับเพิ่มรายการด่วน และทดสอบสลิปจำลอง 1-Click

2. **ระบบตรวจสอบสลิป (Human-in-the-Loop Review Queue)**:
   - คิวรอตรวจสอบสำหรับสลิปที่นำเข้าจาก LINE Bot หรืออัปโหลดผ่านเว็บ
   - กล่องแสดงข้อความดิบที่ระบบ OCR อ่านได้
   - Drag & Drop Dropzone สำหรับลากรูปสลิปมาวางเพื่อให้อ่านข้อความทันที
   - ฟอร์มตรวจสอบและปรับแก้ข้อมูลก่อนกดยืนยัน (Confirm) หรือปฏิเสธ (Reject)

3. **จัดการรายการธุรกรรม (Transactions)**:
   - ค้นหาแบบเรียลไทม์ (Search) ตามบันทึกช่วยจำ ผู้รับเงิน หรือหมวดหมู่
   - ตัวกรองละเอียด: ประเภท (รายรับ/รายจ่าย), หมวดหมู่, เดือน, ช่วงวันที่, แหล่งที่มา
   - สรุปยอดรวมอัตโนมัติตามผลการกรอง
   - ส่งออกข้อมูลเป็นไฟล์ Excel / CSV (`GET /api/transactions/export`) พร้อมเข้ารหัส UTF-8 BOM สำหรับภาษาไทย

4. **หมวดหมู่ (Categories)**:
   - สรุปรายรับ รายจ่าย และจำนวนรายการแยกตามหมวดหมู่ พร้อมแสดงร้อยละของค่าใช้จ่าย
   - ไฮไลต์หมวดหมู่ที่ใช้จ่ายสูงสุดเพื่อช่วยเตือนสตินักศึกษา

5. **รองรับ Dark Mode & Modern UI**:
   - สลับโหมดมืด (Dark Mode) และโหมดสว่าง (Light Mode) ได้อย่างราบรื่น จดจำสถานะผ่าน LocalStorage
   - ดีไซน์ Glassmorphism พร้อมฟอนต์ทันสมัย (Plus Jakarta Sans และ Noto Sans Thai)

---

## โครงสร้างโปรเจกต์

- `backend/` FastAPI + SQLite + SQLAlchemy
  - `app/routers/` API routers (`transactions`, `dashboard`, `line_webhook`, `slips`, `settings`, `health`)
  - `app/services/` คำนวณการเงิน, ตรวจสอบ LINE Signature, OCR Parser
  - `tests/` Pytest ยูนิตเทสต์ครบถ้วน (17 รายการ ผ่าน 100%)
- `frontend/` React 18 + TypeScript + Vite
  - `src/pages/` หน้า Dashboard, Transactions, Review, Categories, LineSettings
  - `src/components/` ฟอร์มบันทึกรายการ
  - `src/styles.css` สไตล์ชีตระบบ ดีไซน์แบบ Glassmorphism รองรับ Dark/Light Mode
- `.env.example` ตัวอย่างค่าคอนฟิก

---

## ความต้องการของเครื่อง

- Python 3.11+
- Node.js 18+

---

## วิธีการรันระบบ

### 1. รัน Backend (FastAPI)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\.env.example .env
uvicorn app.main:app --reload --app-dir . --port 8000
```

เอกสาร API (Swagger UI): เปิดดูได้ที่ [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. รัน Frontend (React + Vite)

```powershell
cd frontend
npm install
npm run dev
```

เปิดใช้งานได้ที่ [http://localhost:5173](http://localhost:5173) (Vite จะ proxy คำขอ `/api` ไปยัง Backend พอร์ต 8000 โดยอัตโนมัติ)

---

## โหมดจำลอง (Mock Mode - ทดสอบได้ทันที)

ค่าเริ่มต้นใน `.env`:
- `LINE_MOCK_MODE=true`
- `OCR_PROVIDER=mock`

คุณสามารถทดสอบการนำเข้าสลิปได้ 3 วิธี:
1. **คลิกปุ่ม "🧪 ทดลองส่งสลิปจำลอง (1-Click)"** บนหน้า Dashboard หรือหน้ารอตรวจสอบสลิปในเว็บแอป
2. **ลากรูปสลิปมาวางใน Dropzone** บนหน้า "รอตรวจสอบสลิป" (/review)
3. **ส่งคำขอผ่าน cURL / PowerShell**:
   ```powershell
   curl -X POST http://localhost:8000/api/line/webhook -H "Content-Type: application/json" -d "{\"events\":[{\"type\":\"message\",\"replyToken\":\"demo\",\"message\":{\"id\":\"local-test-1\",\"type\":\"image\"}}]}"
   ```

---

## การรันเทสต์ (Testing)

ทดสอบการทำงานของ Backend ทั้งหมด (การคำนวณเงิน, Validation, Idempotency ป้องกันสลิปซ้ำ, Signature LINE, Parser สลิปภาษาไทย, และการส่งออก CSV):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest -q
```

---

## การเชื่อมต่อ LINE Messaging API จริง

1. สร้าง Provider และ Messaging API channel ใน [LINE Developers Console](https://developers.line.biz/)
2. คัดลอก Channel secret และ Channel access token ใส่ลงใน `.env`
3. ตั้ง `LINE_MOCK_MODE=false`
4. ตั้งค่า Webhook URL เป็น `https://โดเมนสาธารณะของคุณ/api/line/webhook` (เช่น ผ่าน Cloudflare Tunnel หรือ ngrok)
5. เปิด Use webhook แล้วกด Verify
6. เพิ่มบอทเป็นเพื่อนและส่งรูปสลิปเข้าบอท ระบบจะอ่านข้อความและส่งเข้าคิวรอตรวจสอบบนเว็บแอป

---

## API Endpoints หลัก

- `GET /api/health` - ตรวจสอบสถานะฐานข้อมูลและบริการ
- `GET /api/dashboard/summary` - ข้อมูลสรุปรายรับ รายจ่าย ยอดคงเหลือ และหมวดหมู่
- `GET /api/transactions` - รายการธุรกรรม (รองรับตัวกรอง category, type, month, date_from, date_to, source, search)
- `POST /api/transactions` - สร้างรายการธุรกรรมใหม่
- `PUT /api/transactions/{id}` - แก้ไขรายการธุรกรรม
- `DELETE /api/transactions/{id}` - ลบรายการธุรกรรม
- `GET /api/transactions/export` - ดาวน์โหลดรายการเป็นไฟล์ CSV (UTF-8 BOM สำหรับ Excel)
- `POST /api/slips/upload` - อัปโหลดสลิปตรงจากหน้าเว็บเพื่อรัน OCR
- `POST /api/slips/simulate-mock` - จำลองการส่งสลิปสำหรับทดสอบ
- `POST /api/transactions/{id}/confirm` - ตรวจสอบและยืนยันสลิปเพื่อบันทึกลงบัญชี
- `POST /api/transactions/{id}/reject` - ปฏิเสธรายการสลิป
- `POST /api/line/webhook` - Webhook รองรับอีเวนต์รูปภาพจาก LINE พร้อมตรวจลายเซ็น HMAC-SHA256
- `GET /api/settings/line` - ดูสถานะการเชื่อมต่อบอท LINE
- `GET /api/categories` - รายชื่อหมวดหมู่ทั้งหมด

---

## ความปลอดภัยและความเป็นส่วนตัว

- **ไม่ขอรหัสผ่านธนาคาร** และไม่เชื่อมต่อกับบัญชีเงินฝาก
- รหัสผ่านและ Secrets ถูกเก็บใน `.env` ซึ่งถูก `.gitignore` ไว้แล้ว
- มีระบบตรวจลายเซ็นดิจิทัล `X-Line-Signature` ด้วย HMAC-SHA256
- ป้องกันสลิปซ้ำด้วย Unique Constraint `external_message_id`
- จำกัดขนาดและประเภทของไฟล์ภาพที่อนุญาตให้อัปโหลด
