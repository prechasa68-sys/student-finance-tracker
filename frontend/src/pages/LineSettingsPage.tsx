import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchHealth, fetchLineStatus, simulateMockSlip } from "../api";
import type { LineStatus } from "../types";

export default function LineSettingsPage() {
  const [line, setLine] = useState<LineStatus | null>(null);
  const [health, setHealth] = useState<{ status: string; ocr_provider: string; line: string } | null>(null);
  const [error, setError] = useState("");
  const [simMessage, setSimMessage] = useState("");
  const [loadingSim, setLoadingSim] = useState(false);

  const loadStatus = () => {
    Promise.all([fetchLineStatus(), fetchHealth()])
      .then(([lineData, healthData]) => {
        setLine(lineData);
        setHealth(healthData);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleSimulate() {
    setLoadingSim(true);
    setError("");
    setSimMessage("");
    try {
      const res = await simulateMockSlip();
      setSimMessage(`ส่งสลิปจำลองเข้าสู่ระบบสำเร็จ (ID #${res.id}) คุณสามารถคลิกไปที่ "รอตรวจสอบสลิป" เพื่อดูข้อมูลได้ทันที`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยิงสลิปจำลองไม่สำเร็จ");
    } finally {
      setLoadingSim(false);
    }
  }

  const getStatusClass = (status?: string) => {
    if (!status) return "";
    return status.toLowerCase().replace(/\s+/g, "-");
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-heading">
        <div className="heading-info">
          <h2>💬 ตั้งค่าและเชื่อมต่อ LINE Messaging API</h2>
          <p>
            ตรวจสอบสถานะการเชื่อมต่อบอท LINE และคู่มือการตั้งค่าสำหรับรับรูปสลิป
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="outline" onClick={loadStatus}>
            🔄 รีเฟรชสถานะ
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">⚠️ {error}</div> : null}
      {simMessage ? (
        <div className="success-banner" style={{ justifyContent: "space-between" }}>
          <span>✅ {simMessage}</span>
          <Link to="/review" className="primary" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}>
            ไปตรวจสอบทันที →
          </Link>
        </div>
      ) : null}

      {/* Status Card */}
      <article className="card">
        <div className="card-header">
          <h3>📡 สถานะระบบปัจจุบัน</h3>
          <div className={`status-chip ${getStatusClass(line?.status)}`}>
            <span className="dot" />
            {line?.status ?? "กำลังตรวจสอบ..."}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p style={{ fontSize: "1.05rem", fontWeight: 600 }}>{line?.message}</p>
          {line?.bot_display_name ? (
            <p>
              👤 ชื่อบัญชีบอท LINE: <b>{line.bot_display_name}</b>
            </p>
          ) : null}
          <p className="muted">
            🔍 OCR Provider ที่ใช้งาน: <b>{line?.ocr_provider ?? health?.ocr_provider}</b>
          </p>
          <p className="muted">
            🛡️ ระบบตรวจสอบลายเซ็น HMAC-SHA256: <b>{line?.mock_mode ? "ปิดใช้งาน (Mock Mode)" : "เปิดใช้งานจริง"}</b>
          </p>
        </div>
      </article>

      {/* Mock Mode Testing Card */}
      <article className="card" style={{ border: "1px dashed var(--brand)" }}>
        <div className="card-header">
          <h3>⚡ ทดสอบระบบในโหมดจำลอง (Mock Mode)</h3>
          <span className="tag tag-source">ไม่ต้องใช้ LINE Token</span>
        </div>
        <p style={{ fontSize: "0.92rem", marginBottom: "1rem" }}>
          ในโหมดพัฒนา สามารถจำลองเหตุการณ์ส่งสลิปได้ทันทีโดยไม่ต้องเชื่อมต่อกับเซิร์ฟเวอร์ภายนอกหรือ ngrok:
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="primary"
            onClick={handleSimulate}
            disabled={loadingSim}
          >
            {loadingSim ? "⏳ กำลังส่ง..." : "🚀 ยิงสลิปจำลองเข้าสู่ระบบ (1-Click Test)"}
          </button>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            หรือใช้ curl ยิงเข้า Webhook:
          </span>
        </div>
        <div className="ocr-box" style={{ marginTop: "0.75rem" }}>
{`curl -X POST http://localhost:8000/api/line/webhook \\
  -H "Content-Type: application/json" \\
  -d '{"events":[{"type":"message","replyToken":"demo","message":{"id":"local-test-1","type":"image"}}]}' `}
        </div>
      </article>

      {/* LINE Developers Console Guide */}
      <article className="card">
        <div className="card-header">
          <h3>📋 ขั้นตอนการเชื่อมต่อ LINE Official Account จริง</h3>
        </div>
        <ol className="steps-list">
          <li className="step-item">
            <div className="step-number">1</div>
            <div className="step-text">
              ไปที่ <a href="https://developers.line.biz/" target="_blank" rel="noreferrer">LINE Developers Console</a> สร้าง Provider และสร้าง Channel ประเภท <b>Messaging API</b>
            </div>
          </li>
          <li className="step-item">
            <div className="step-number">2</div>
            <div className="step-text">
              คัดลอก <b>Channel secret</b> จากแท็บ <i>Basic settings</i> และออก <b>Channel access token</b> จากแท็บ <i>Messaging API</i>
            </div>
          </li>
          <li className="step-item">
            <div className="step-number">3</div>
            <div className="step-text">
              นำค่าที่ได้ไประบุในไฟล์ <code>.env</code> ของระบบ:
              <div className="ocr-box" style={{ margin: "0.5rem 0" }}>
{`LINE_CHANNEL_SECRET=ใส่_Channel_Secret_ที่นี่
LINE_CHANNEL_ACCESS_TOKEN=ใส่_Channel_Access_Token_ที่นี่
LINE_MOCK_MODE=false`}
              </div>
            </div>
          </li>
          <li className="step-item">
            <div className="step-number">4</div>
            <div className="step-text">
              ตั้งค่า <b>Webhook URL</b> ใน LINE Developers เป็น <code>https://&lt;domain-ของคุณ&gt;/api/line/webhook</code> จากนั้นเปิดสวิตช์ <b>Use webhook</b> แล้วกดปุ่ม <b>Verify</b>
            </div>
          </li>
          <li className="step-item">
            <div className="step-number">5</div>
            <div className="step-text">
              เพิ่มบอทเป็นเพื่อน และส่งรูปสลิปธนาคารเข้าแชทบอท บอทจะตอบกลับข้อมูลที่อ่านได้ และส่งเข้าคิวในหน้า <b>"รอตรวจสอบสลิป"</b>
            </div>
          </li>
        </ol>
      </article>

      {/* Security & System Architecture Info */}
      <article className="card">
        <div className="card-header">
          <h3>🔒 ความปลอดภัยและความเป็นส่วนตัว</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
          <p>
            • <b>ไม่มีการเข้าถึงบัญชีธนาคาร:</b> ระบบนี้ไม่อ่านประวัติธนาคารและไม่มีการเชื่อมต่อ API ใด ๆ กับระบบธนาคาร ข้อมูลทั้งหมดมาจากการอ่านข้อความบนรูปสลิปที่ผู้ใช้ส่งเข้ามาเท่านั้น
          </p>
          <p>
            • <b>มนุษย์เป็นผู้ตรวจสอบเสมอ (Human-in-the-Loop):</b> รายการจากสลิปทั้งหมดจะอยู่ในสถานะ <i>"รอตรวจสอบ"</i> และจะไม่ถูกนับรวมในรายรับรายจ่ายจนกว่าผู้ใช้จะกดตรวจทานและยืนยัน
          </p>
          <p>
            • <b>ระบบป้องกันการส่งซ้ำ (Idempotency):</b> สลิปแต่ละใบจะถูกตรวจสอบด้วย <code>external_message_id</code> หากส่งสลิปเดิมซ้ำ ระบบจะไม่สร้างรายการซ้ำซ้อนในฐานข้อมูล
          </p>
          <p>
            • <b>การยืนยันตัวตน Webhook:</b> ทุกคำขอที่ส่งมาจาก LINE จะถูกตรวจสอบความถูกต้องของลายเซ็นดิจิทัล HMAC-SHA256 ด้วย Channel Secret ป้องกันคำขอปลอมแปลง
          </p>
        </div>
      </article>
    </section>
  );
}
