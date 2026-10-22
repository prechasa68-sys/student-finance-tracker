import { DragEvent, ChangeEvent, useEffect, useState } from "react";
import { confirmTransaction, fetchTransactions, rejectTransaction, simulateMockSlip, uploadSlip } from "../api";
import TransactionForm from "../components/TransactionForm";
import { formatDateTime, formatMoney, sourceLabel } from "../format";
import type { Transaction, TransactionPayload } from "../types";

interface Props {
  onUpdate?: () => void;
}

export default function ReviewPage({ onUpdate }: Props) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  async function load(autoSelectFirst = true) {
    try {
      const data = await fetchTransactions({ status: "pending_review" });
      setItems(data);
      if (autoSelectFirst) {
        setSelected((current) => data.find((item) => item.id === current?.id) ?? data[0] ?? null);
      }
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายการไม่สำเร็จ");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConfirm(payload: TransactionPayload) {
    if (!selected) return;
    setError("");
    setSuccess("");
    try {
      await confirmTransaction(selected.id, payload);
      setSuccess(`ยืนยันและบันทึกรายการ #${selected.id} สำเร็จ!`);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยืนยันรายการไม่สำเร็จ");
    }
  }

  async function handleReject() {
    if (!selected) return;
    if (!window.confirm("ยืนยันที่จะปฏิเสธรายการนี้หรือไม่? (รายการจะไม่ถูกบันทึกลงยอดเงิน)")) return;
    setError("");
    setSuccess("");
    try {
      await rejectTransaction(selected.id);
      setSuccess(`ปฏิเสธรายการ #${selected.id} เรียบร้อยแล้ว`);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ปฏิเสธรายการไม่สำเร็จ");
    }
  }

  async function processImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพเท่านั้น (.jpg, .png, .webp, .gif)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("ไฟล์รูปภาพมีขนาดเกิน 5MB");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await uploadSlip(base64Data, file.name);
        setSuccess(`อัปโหลดและอ่านสลิปสำเร็จ! รายการ #${res.id} ถูกเพิ่มเข้ารอตรวจสอบแล้ว`);
        await load();
        setSelected(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "อัปโหลดและประมวลผลสลิปไม่สำเร็จ");
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setError("อ่านไฟล์ไม่สำเร็จ");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  }

  async function handleSimulate() {
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const res = await simulateMockSlip();
      setSuccess(`จำลองรับสลิป #${res.id} สำเร็จ! ข้อมูลถูกนำเข้าสู่คิวแล้ว`);
      await load();
      setSelected(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "จำลองสลิปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-heading">
        <div className="heading-info">
          <h2>🧾 ตรวจสอบสลิปและยืนยันรายการ</h2>
          <p>
            ตรวจสอบข้อมูลที่ระบบอ่านได้จากรูปสลิปก่อนบันทึกลงบัญชีจริง (ระบบไม่อ่านประวัติธนาคารและไม่ได้ยืนยันว่าโอนเงินจริง)
          </p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="outline"
            onClick={handleSimulate}
            disabled={uploading}
          >
            {uploading ? "⏳ กำลังดำเนินการ..." : "⚡ จำลองรับสลิป Mock"}
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">⚠️ {error}</div> : null}
      {success ? <div className="success-banner">✅ {success}</div> : null}

      {/* Upload Dropzone */}
      <div
        className={`slip-dropzone ${isDragOver ? "dragover" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("slip-file-input")?.click()}
      >
        <input
          id="slip-file-input"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
        <div className="dropzone-icon">📸</div>
        <div className="dropzone-text">
          <h4>{uploading ? "⏳ กำลังส่งภาพไปประมวลผล OCR..." : "ลากรูปสลิปมาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"}</h4>
          <p>รองรับไฟล์ JPG, PNG, WEBP, GIF ขนาดไม่เกิน 5MB (ระบบจะทำการ OCR และนำข้อมูลมาให้ตรวจ)</p>
        </div>
      </div>

      <div className="split">
        {/* Pending Queue List */}
        <article className="card">
          <div className="card-header">
            <h3>📥 คิวสลิปรอการตรวจสอบ ({items.length})</h3>
            <button
              className="ghost"
              style={{ fontSize: "0.85rem", padding: "0.3rem 0.6rem" }}
              onClick={() => load(false)}
            >
              🔄 รีเฟรช
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <p>ไม่มีสลิปรอตรวจสอบในขณะนี้</p>
              <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.5rem" }}>
                ลองส่งรูปผ่าน LINE หรือลากไฟล์มาวางด้านบนเพื่อทดสอบ
              </p>
            </div>
          ) : (
            <ul className="review-queue-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`review-item-btn ${selected?.id === item.id ? "active" : ""}`}
                    onClick={() => {
                      setSelected(item);
                      setError("");
                      setSuccess("");
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <strong style={{ fontSize: "1.05rem", color: "var(--text-main)" }}>
                        {formatMoney(item.amount)}
                      </strong>
                      <span className="muted" style={{ fontSize: "0.8rem" }}>
                        📅 {formatDateTime(item.transaction_date)}
                      </span>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        👤 {item.party_name || "ไม่พบชื่อในสลิป"}
                      </span>
                    </div>
                    <div>
                      <span className="tag tag-source" style={{ fontSize: "0.75rem" }}>
                        {sourceLabel(item.source)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* Selected Item Review & Confirm */}
        <div>
          {selected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <article className="card">
                <div className="card-header">
                  <h3>🔍 ข้อความดิบที่ระบบ OCR อ่านได้</h3>
                  <span className="status-chip not-configured">รอการยืนยัน</span>
                </div>
                <div className="ocr-box">
                  {selected.raw_ocr_text || "ไม่มีข้อความดิบ"}
                </div>
                <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.6rem" }}>
                  * ฟิลด์ที่อ่านไม่พบจะปล่อยว่างไว้ ผู้ใช้สามารถกรอกและปรับแต่งข้อมูลให้ถูกต้องในฟอร์มด้านล่างได้ทันที
                </p>
              </article>

              <div>
                <h4 style={{ marginBottom: "0.6rem", fontSize: "1.05rem" }}>
                  ✏️ ตรวจสอบความถูกต้องและบันทึกรายการ #{selected.id}
                </h4>
                <TransactionForm
                  key={`review-${selected.id}`}
                  initial={{
                    ...selected,
                    type: selected.type ?? "expense",
                    category: selected.category ?? "อาหาร",
                  }}
                  submitLabel="✅ ยืนยันและบันทึกลงบัญชี"
                  onSubmit={handleConfirm}
                />
                <div style={{ marginTop: "0.85rem", display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" className="danger" onClick={handleReject}>
                    ❌ ปฏิเสธรายการนี้ (ไม่บันทึก)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <article className="card">
              <div className="empty-state">
                <div className="empty-state-icon">👈</div>
                <p>เลือกรายการจากคิวทางซ้ายเพื่อเริ่มตรวจสอบและยืนยัน</p>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
