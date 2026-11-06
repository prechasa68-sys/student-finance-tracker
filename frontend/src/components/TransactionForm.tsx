import { FormEvent, useEffect, useState } from "react";
import { fetchCategories, scanSlip } from "../api";
import { toDateTimeLocal } from "../format";
import type { Transaction, TransactionPayload } from "../types";

interface Props {
  initial?: Partial<Transaction>;
  submitLabel: string;
  onSubmit: (payload: TransactionPayload) => Promise<void>;
  requireComplete?: boolean;
  onCancel?: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  อาหาร: "🍔",
  เดินทาง: "🚗",
  การเรียน: "📚",
  ที่พัก: "🏠",
  ช้อปปิ้ง: "🛍️",
  รายได้: "💰",
  "อื่น ๆ": "📦",
};

const PRESET_CATEGORIES = ["อาหาร", "เดินทาง", "การเรียน", "ที่พัก", "ช้อปปิ้ง", "รายได้", "อื่น ๆ"];

export default function TransactionForm({
  initial,
  submitLabel,
  onSubmit,
  requireComplete = true,
  onCancel,
}: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [type, setType] = useState<"income" | "expense" | null>(
    initial ? initial.type ?? null : "income",
  );
  const [amount, setAmount] = useState(initial?.amount ?? "");
  
  // Custom category state
  const initialCat = initial?.category ?? "";
  const isInitialCustom = initialCat && !PRESET_CATEGORIES.includes(initialCat);
  const [category, setCategory] = useState<string | null>(
    isInitialCustom ? "อื่น ๆ" : (initial?.category ?? (initial ? null : "รายได้")),
  );
  const [customOther, setCustomOther] = useState(
    isInitialCustom
      ? initialCat.replace(/^(อื่น ๆ:?\s*|อื่นๆ:?\s*)/, "")
      : (initialCat === "อื่น ๆ" ? "" : ""),
  );

  const [transactionDate, setTransactionDate] = useState(
    initial
      ? toDateTimeLocal(initial.transaction_date ?? null)
      : toDateTimeLocal(new Date().toISOString()),
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพสลิปเท่านั้น (.jpg, .png)");
      return;
    }
    setScanning(true);
    setError("");
    setScanSuccess("");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await scanSlip(base64, file.name);
        if (res.type) setType(res.type);
        if (res.amount) setAmount(String(res.amount));
        if (res.category) {
          if (PRESET_CATEGORIES.includes(res.category)) {
            setCategory(res.category);
            setCustomOther("");
          } else {
            setCategory("อื่น ๆ");
            setCustomOther(res.category.replace(/^(อื่น ๆ:?\s*|อื่นๆ:?\s*)/, ""));
          }
        }
        if (res.transaction_date) {
          setTransactionDate(toDateTimeLocal(res.transaction_date));
        }
        if (res.note) {
          setNote(res.note);
        } else if (res.party_name) {
          setNote(`สลิป: ${res.party_name}`);
        }
        setScanSuccess(`✨ AI อ่านสลิปสำเร็จ! ยอด ${res.amount} บาท (${res.type === "income" ? "รายรับ" : "รายจ่าย"})`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "สแกนสลิปไม่สำเร็จ");
      } finally {
        setScanning(false);
        e.target.value = "";
      }
    };
    reader.onerror = () => {
      setError("อ่านไฟล์รูปภาพไม่สำเร็จ");
      setScanning(false);
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    fetchCategories()
      .then((data) => {
        const list = Array.from(new Set([...PRESET_CATEGORIES, ...(data.categories || [])]));
        setCategories(list);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    setType(initial ? initial.type ?? null : "income");
    setAmount(initial?.amount ?? "");
    const curCat = initial?.category ?? "";
    const isCustom = curCat && !PRESET_CATEGORIES.includes(curCat);
    if (isCustom) {
      setCategory("อื่น ๆ");
      setCustomOther(curCat.replace(/^(อื่น ๆ:?\s*|อื่นๆ:?\s*)/, ""));
    } else {
      setCategory(initial ? initial.category ?? null : "รายได้");
      setCustomOther("");
    }
    setTransactionDate(
      initial
        ? toDateTimeLocal(initial.transaction_date ?? null)
        : toDateTimeLocal(new Date().toISOString()),
    );
    setNote(initial?.note ?? "");
  }, [initial]);

  function setToday() {
    setTransactionDate(toDateTimeLocal(new Date().toISOString()));
  }

  function setYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setTransactionDate(toDateTimeLocal(yesterday.toISOString()));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    let resolvedCategory = category;
    if (category === "อื่น ๆ") {
      const trimmed = customOther.trim();
      if (trimmed) {
        resolvedCategory = trimmed.startsWith("อื่น") ? trimmed : `อื่น ๆ: ${trimmed}`;
      } else {
        resolvedCategory = "อื่น ๆ";
      }
    }

    if (requireComplete && (!amount || !resolvedCategory || !transactionDate || !type)) {
      setError("กรุณากรอกประเภท จำนวนเงิน หมวดหมู่ และวันที่ให้ครบถ้วน");
      return;
    }

    if (amount && Number(amount) <= 0) {
      setError("จำนวนเงินต้องมากกว่า 0 บาท");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        type,
        amount: amount || null,
        category: resolvedCategory,
        transaction_date: transactionDate ? new Date(transactionDate).toISOString() : null,
        note: note || null,
      });
      if (!initial) {
        setAmount("");
        setNote("");
        setCustomOther("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={handleSubmit}>
      {/* AI Slip Scanner Box */}
      <div
        className="full"
        style={{
          border: "2px dashed var(--brand, #3b82f6)",
          padding: "0.85rem",
          borderRadius: "10px",
          textAlign: "center",
          background: "rgba(59, 130, 246, 0.05)",
          marginBottom: "0.5rem",
        }}
      >
        <input
          type="file"
          accept="image/*"
          id="slip-upload-input"
          style={{ display: "none" }}
          onChange={handleFileChange}
          disabled={scanning}
        />
        <label
          htmlFor="slip-upload-input"
          style={{ cursor: scanning ? "wait" : "pointer", display: "block", margin: 0 }}
        >
          <div style={{ fontSize: "1.7rem", marginBottom: "0.15rem" }}>
            {scanning ? "⏳" : "📸"}
          </div>
          <b style={{ color: "var(--brand, #3b82f6)", fontSize: "0.95rem" }}>
            {scanning ? "กำลังวิเคราะห์สลิปด้วย AI..." : "แตะที่นี่เพื่อถ่ายรูป / แนบสลิปโอนเงิน (สแกนอัตโนมัติ)"}
          </b>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
            ระบบจะดึงยอดเงิน วันที่ และจัดหมวดหมู่อัตโนมัติใน 1 วินาที
          </p>
        </label>
      </div>

      {scanSuccess && <div className="success-banner full">{scanSuccess}</div>}

      <div className="full" style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
        <button
          type="button"
          onClick={() => {
            setType("income");
            if (category === "อาหาร") setCategory("รายได้");
          }}
          className={type === "income" ? "success" : "outline"}
          style={{ flex: 1, padding: "0.55rem" }}
        >
          🔺 รายรับ (Income)
        </button>
        <button
          type="button"
          onClick={() => {
            setType("expense");
            if (category === "รายได้") setCategory("อาหาร");
          }}
          className={type === "expense" ? "danger" : "outline"}
          style={{ flex: 1, padding: "0.55rem" }}
        >
          🔻 รายจ่าย (Expense)
        </button>
      </div>

      <label>
        จำนวนเงิน (บาท) *
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={amount ?? ""}
          onChange={(e) => setAmount(e.target.value)}
          required={requireComplete}
        />
      </label>

      <label>
        หมวดหมู่ *
        <select
          value={category ?? ""}
          onChange={(e) => setCategory(e.target.value || null)}
          required={requireComplete}
        >
          <option value="">-- เลือกหมวดหมู่ --</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {CATEGORY_ICONS[item] || "🏷️"} {item}
            </option>
          ))}
        </select>
      </label>

      {category === "อื่น ๆ" && (
        <label className="full" style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "8px", border: "1px dashed var(--brand, #3b82f6)" }}>
          <span>✍️ ระบุรายละเอียดหมวดหมู่อื่น ๆ (เช่น อื่นๆ: เงินจากผู้ปกครอง, ค่าซ่อมรถ) *</span>
          <input
            type="text"
            value={customOther}
            onChange={(e) => setCustomOther(e.target.value)}
            placeholder="พิมพ์หมวดหมู่ที่ต้องการ เช่น เงินจากผู้ปกครอง, รายได้พิเศษ, ของใช้ส่วนตัว"
            required={requireComplete}
            style={{ marginTop: "0.35rem" }}
          />
        </label>
      )}

      <label className="full">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>วันที่และเวลา *</span>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              className="ghost"
              style={{ fontSize: "0.78rem", padding: "0.15rem 0.5rem" }}
              onClick={setToday}
            >
              วันนี้
            </button>
            <button
              type="button"
              className="ghost"
              style={{ fontSize: "0.78rem", padding: "0.15rem 0.5rem" }}
              onClick={setYesterday}
            >
              เมื่อวาน
            </button>
          </div>
        </div>
        <input
          type="datetime-local"
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          required={requireComplete}
        />
      </label>

      <label className="full">
        บันทึกช่วยจำ / หมายเหตุ
        <input
          value={note ?? ""}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น ค่าอาหารกลางวัน, โอนคืนเพื่อน, ค่าหอพัก"
        />
      </label>

      {error ? <div className="error-banner full">{error}</div> : null}

      <div className="full" style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button className="primary" disabled={saving} type="submit" style={{ flex: 2 }}>
          {saving ? "⏳ กำลังบันทึก..." : submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="outline" onClick={onCancel} style={{ flex: 1 }}>
            ยกเลิก
          </button>
        ) : null}
      </div>
    </form>
  );
}
