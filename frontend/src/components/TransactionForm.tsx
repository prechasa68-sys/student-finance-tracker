import { FormEvent, useEffect, useState } from "react";
import { fetchCategories } from "../api";
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

export default function TransactionForm({
  initial,
  submitLabel,
  onSubmit,
  requireComplete = true,
  onCancel,
}: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [type, setType] = useState<"income" | "expense" | null>(
    initial ? initial.type ?? null : "expense",
  );
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [category, setCategory] = useState<string | null>(
    initial ? initial.category ?? null : "อาหาร",
  );
  const [transactionDate, setTransactionDate] = useState(
    initial
      ? toDateTimeLocal(initial.transaction_date ?? null)
      : toDateTimeLocal(new Date().toISOString()),
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data.categories))
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    setType(initial ? initial.type ?? null : "expense");
    setAmount(initial?.amount ?? "");
    setCategory(initial ? initial.category ?? null : "อาหาร");
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

    if (requireComplete && (!amount || !category || !transactionDate || !type)) {
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
        category,
        transaction_date: transactionDate ? new Date(transactionDate).toISOString() : null,
        note: note || null,
      });
      if (!initial) {
        setAmount("");
        setNote("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={handleSubmit}>
      <div className="full" style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
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
        <button
          type="button"
          onClick={() => {
            setType("income");
            setCategory("รายได้");
          }}
          className={type === "income" ? "success" : "outline"}
          style={{ flex: 1, padding: "0.55rem" }}
        >
          🔺 รายรับ (Income)
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
