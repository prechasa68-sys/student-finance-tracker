import { useEffect, useMemo, useState } from "react";
import {
  createTransaction,
  deleteTransaction,
  fetchCategories,
  fetchTransactions,
  getExportCsvUrl,
  updateTransaction,
} from "../api";
import TransactionForm from "../components/TransactionForm";
import { formatDateTime, formatMoney, sourceLabel, statusLabel } from "../format";
import type { Transaction, TransactionPayload } from "../types";

const CATEGORY_ICONS: Record<string, string> = {
  อาหาร: "🍔",
  เดินทาง: "🚗",
  การเรียน: "📚",
  ที่พัก: "🏠",
  ช้อปปิ้ง: "🛍️",
  รายได้: "💰",
  "อื่น ๆ": "📦",
};

export default function TransactionsPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    category: "",
    month: "",
    date_from: "",
    date_to: "",
    source: "",
  });

  async function load() {
    try {
      const params: Record<string, string | undefined> = {
        type: filters.type || undefined,
        category: filters.category || undefined,
        month: filters.month || undefined,
        date_from: filters.date_from
          ? new Date(`${filters.date_from}T00:00:00`).toISOString()
          : undefined,
        date_to: filters.date_to
          ? new Date(`${filters.date_to}T23:59:59.999`).toISOString()
          : undefined,
        source: filters.source || undefined,
        search: searchQuery.trim() || undefined,
      };
      const data = await fetchTransactions(params);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายการไม่สำเร็จ");
    }
  }

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data.categories))
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [filters, searchQuery]);

  const visible = useMemo(() => items.filter((item) => item.status !== "rejected"), [items]);

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let income = 0;
    let expense = 0;
    visible.forEach((item) => {
      if (item.status === "confirmed") {
        const val = Number(item.amount || 0);
        if (item.type === "income") income += val;
        else if (item.type === "expense") expense += val;
      }
    });
    return { totalIncome: income, totalExpense: expense, balance: income - expense };
  }, [visible]);

  async function handleCreate(payload: TransactionPayload) {
    try {
      setError("");
      setSuccess("");
      await createTransaction({ ...payload, source: "manual", status: "confirmed" });
      setSuccess("เพิ่มรายการสำเร็จ!");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เพิ่มรายการไม่สำเร็จ");
    }
  }

  async function handleUpdate(payload: TransactionPayload) {
    if (!editing) return;
    try {
      setError("");
      setSuccess("");
      await updateTransaction(editing.id, { ...payload, status: "confirmed" });
      setSuccess("บันทึกการแก้ไขสำเร็จ!");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "แก้ไขรายการไม่สำเร็จ");
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("ยืนยันที่จะลบรายการนี้อย่างถาวรหรือไม่?")) return;
    try {
      setError("");
      setSuccess("");
      await deleteTransaction(id);
      setSuccess("ลบรายการสำเร็จ");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบรายการไม่สำเร็จ");
    }
  }

  function handleResetFilters() {
    setSearchQuery("");
    setFilters({
      type: "",
      category: "",
      month: "",
      date_from: "",
      date_to: "",
      source: "",
    });
  }

  const exportUrl = getExportCsvUrl({
    type: filters.type || undefined,
    category: filters.category || undefined,
    month: filters.month || undefined,
    date_from: filters.date_from ? new Date(`${filters.date_from}T00:00:00`).toISOString() : undefined,
    date_to: filters.date_to ? new Date(`${filters.date_to}T23:59:59.999`).toISOString() : undefined,
    source: filters.source || undefined,
    search: searchQuery.trim() || undefined,
  });

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-heading">
        <div className="heading-info">
          <h2>📑 รายการธุรกรรมทั้งหมด</h2>
          <p>ค้นหา กรอง เพิ่ม แก้ไข ลบ และส่งออกข้อมูลเป็นไฟล์ Excel / CSV ได้สะดวก</p>
        </div>
        <div className="heading-actions">
          <a
            href={exportUrl}
            download="transactions.csv"
            className="outline"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            📥 ส่งออก CSV (Excel)
          </a>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setEditing(null);
              setShowForm((prev) => !prev);
            }}
          >
            {showForm ? "✕ ปิดฟอร์ม" : "+ เพิ่มรายการใหม่"}
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">⚠️ {error}</div> : null}
      {success ? <div className="success-banner">✅ {success}</div> : null}

      {/* Form Area */}
      {(showForm || editing) && (
        <article className="card" style={{ border: "2px solid var(--brand)" }}>
          <div className="card-header">
            <h3>{editing ? `✏️ แก้ไขรายการ #${editing.id}` : "➕ เพิ่มรายการรายรับ / รายจ่าย"}</h3>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setEditing(null);
                setShowForm(false);
              }}
            >
              ✕
            </button>
          </div>
          <TransactionForm
            key={editing ? `edit-${editing.id}` : "create"}
            initial={editing ?? undefined}
            submitLabel={editing ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
            onSubmit={editing ? handleUpdate : handleCreate}
            onCancel={() => {
              setEditing(null);
              setShowForm(false);
            }}
          />
        </article>
      )}

      {/* Filter & Search Card */}
      <article className="card filter-card">
        <div className="filter-grid">
          <label>
            🔍 ค้นหา (หมายเหตุ / ผู้รับ)
            <input
              type="text"
              placeholder="พิมพ์คำค้นหา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>

          <label>
            ประเภท
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">ทั้งหมด (รายรับ/รายจ่าย)</option>
              <option value="expense">รายจ่าย</option>
              <option value="income">รายรับ</option>
            </select>
          </label>

          <label>
            หมวดหมู่
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_ICONS[item] || "🏷️"} {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            เลือกเดือน
            <input
              type="month"
              value={filters.month}
              onChange={(e) =>
                setFilters({ ...filters, month: e.target.value, date_from: "", date_to: "" })
              }
            />
          </label>

          <label>
            แหล่งที่มา
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            >
              <option value="">ทุกแหล่งที่มา</option>
              <option value="manual">เพิ่มเอง</option>
              <option value="line_ocr">จาก LINE OCR</option>
              <option value="web_ocr">อัปโหลดสลิปเว็บ</option>
            </select>
          </label>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="ghost"
              style={{ width: "100%", padding: "0.65rem" }}
              onClick={handleResetFilters}
            >
              🔄 ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Filter Summary Bar */}
        <div
          style={{
            marginTop: "1.2rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            fontSize: "0.9rem",
          }}
        >
          <div>
            แสดงทั้งหมด <b>{visible.length}</b> รายการ
          </div>
          <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
            <span>
              รายรับ: <b className="money-income">+{formatMoney(totalIncome)}</b>
            </span>
            <span>
              รายจ่าย: <b className="money-expense">-{formatMoney(totalExpense)}</b>
            </span>
            <span>
              คงเหลือ: <b>{formatMoney(balance)}</b>
            </span>
          </div>
        </div>
      </article>

      {/* Transactions Table */}
      <article className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่ / เวลา</th>
                <th>ประเภท</th>
                <th>หมวดหมู่</th>
                <th>จำนวนเงิน</th>
                <th>หมายเหตุ / รายละเอียด</th>
                <th>ที่มา</th>
                <th>สถานะ</th>
                <th style={{ textAlign: "right" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(item.transaction_date)}</td>
                  <td>
                    <span
                      className={`tag ${
                        item.type === "income"
                          ? "tag-income"
                          : item.type === "expense"
                          ? "tag-expense"
                          : ""
                      }`}
                    >
                      {item.type === "income" ? "🔺 รายรับ" : item.type === "expense" ? "🔻 รายจ่าย" : "-"}
                    </span>
                  </td>
                  <td>
                    {item.category ? (
                      <span className="tag tag-category">
                        {CATEGORY_ICONS[item.category] || "🏷️"} {item.category}
                      </span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={
                        item.type === "income"
                          ? "money-income"
                          : item.type === "expense"
                          ? "money-expense"
                          : ""
                      }
                      style={{ fontSize: "1rem" }}
                    >
                      {item.type === "income" ? "+" : item.type === "expense" ? "-" : ""}
                      {formatMoney(item.amount)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{item.note || <span className="muted">-</span>}</span>
                      {item.party_name && (
                        <span className="muted" style={{ fontSize: "0.78rem" }}>
                          สลิป: {item.party_name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="tag tag-source">{sourceLabel(item.source)}</span>
                  </td>
                  <td>
                    <span
                      className={`status-chip ${
                        item.status === "confirmed" ? "connected" : "not-configured"
                      }`}
                      style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        type="button"
                        className="outline"
                        style={{ padding: "0.35rem 0.7rem", fontSize: "0.82rem" }}
                        onClick={() => {
                          setEditing(item);
                          setShowForm(false);
                          window.scrollTo({ top: 180, behavior: "smooth" });
                        }}
                      >
                        ✏️ แก้ไข
                      </button>
                      <button
                        type="button"
                        className="danger"
                        style={{ padding: "0.35rem 0.7rem", fontSize: "0.82rem" }}
                        onClick={() => handleDelete(item.id)}
                      >
                        🗑️ ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <p>ไม่พบรายการธุรกรรมตามตัวกรองที่เลือก</p>
          </div>
        ) : null}
      </article>
    </section>
  );
}
