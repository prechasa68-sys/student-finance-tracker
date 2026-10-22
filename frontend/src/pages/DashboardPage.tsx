import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLineStatus, fetchSummary, fetchTransactions, simulateMockSlip } from "../api";
import { formatDateTime, formatMoney, sourceLabel, statusLabel } from "../format";
import type { DashboardSummary, LineStatus, Transaction } from "../types";

const CATEGORY_ICONS: Record<string, string> = {
  อาหาร: "🍔",
  เดินทาง: "🚗",
  การเรียน: "📚",
  ที่พัก: "🏠",
  ช้อปปิ้ง: "🛍️",
  รายได้: "💰",
  "อื่น ๆ": "📦",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pending, setPending] = useState<Transaction[]>([]);
  const [line, setLine] = useState<LineStatus | null>(null);
  const [error, setError] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState("");

  const loadAll = () => {
    Promise.all([
      fetchSummary(),
      fetchTransactions({ status: "pending_review" }),
      fetchLineStatus(),
    ])
      .then(([summaryData, pendingData, lineData]) => {
        setSummary(summaryData);
        setPending(pendingData);
        setLine(lineData);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    setSimMessage("");
    try {
      const res = await simulateMockSlip();
      setSimMessage(`สร้างรายการสลิปจำลอง ID #${res.id} สำเร็จ! ไปตรวจสอบที่หน้ารอตรวจสอบสลิปได้เลย`);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "จำลองสลิปไม่สำเร็จ");
    } finally {
      setSimulating(false);
    }
  };

  const totalExpenseNum = Number(summary?.expense_total || 0);
  const totalIncomeNum = Number(summary?.income_total || 0);
  const expenseRatio = totalIncomeNum > 0 ? Math.round((totalExpenseNum / totalIncomeNum) * 100) : 0;

  const maxCategory = Math.max(
    ...(summary?.expense_by_category.map((item) => Number(item.total)) ?? [0]),
    1,
  );

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-heading">
        <div className="heading-info">
          <h2>📊 Dashboard การเงินนักศึกษา</h2>
          <p>ภาพรวมรายรับ รายจ่าย ยอดคงเหลือ และรายการสลิปจาก LINE ที่รอตรวจสอบ</p>
        </div>
        <div className="heading-actions">
          <Link className="primary" to="/transactions">
            + บันทึกรายการเอง
          </Link>
          <Link className="outline" to="/review">
            🧾 ตรวจสอบสลิป ({pending.length})
          </Link>
        </div>
      </div>

      {error ? <div className="error-banner">⚠️ {error}</div> : null}
      {simMessage ? <div className="success-banner">✨ {simMessage}</div> : null}

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <div className="quick-actions-title">
          <span>⚡ ทางลัดการใช้งาน:</span>
        </div>
        <div className="quick-buttons">
          <Link to="/transactions" className="outline" style={{ fontSize: "0.85rem", padding: "0.45rem 0.8rem" }}>
            ➕ เพิ่มรายรับ/รายจ่าย
          </Link>
          <Link to="/review" className="outline" style={{ fontSize: "0.85rem", padding: "0.45rem 0.8rem" }}>
            📸 อัปโหลดสลิปตรวจจับ OCR
          </Link>
          <button
            type="button"
            className="outline"
            style={{ fontSize: "0.85rem", padding: "0.45rem 0.8rem" }}
            onClick={handleSimulate}
            disabled={simulating}
          >
            {simulating ? "⏳ กำลังจำลอง..." : "🧪 ทดลองส่งสลิปจำลอง (1-Click)"}
          </button>
        </div>
      </div>

      {/* Stat Grid */}
      <div className="stat-grid">
        <article className="stat-card income">
          <div className="stat-top">
            <span className="stat-label">รายรับทั้งหมด</span>
            <div className="stat-icon">💰</div>
          </div>
          <div className="stat-amount">+{formatMoney(summary?.income_total)}</div>
        </article>

        <article className="stat-card expense">
          <div className="stat-top">
            <span className="stat-label">รายจ่ายทั้งหมด</span>
            <div className="stat-icon">💸</div>
          </div>
          <div className="stat-amount">-{formatMoney(summary?.expense_total)}</div>
        </article>

        <article className="stat-card balance">
          <div className="stat-top">
            <span className="stat-label">ยอดคงเหลือสุทธิ</span>
            <div className="stat-icon">🏦</div>
          </div>
          <div className="stat-amount">{formatMoney(summary?.balance)}</div>
        </article>

        <article className="stat-card pending">
          <div className="stat-top">
            <span className="stat-label">สลิปรอตรวจสอบ</span>
            <div className="stat-icon">🧾</div>
          </div>
          <div className="stat-amount" style={{ color: "var(--warning)" }}>
            {summary?.pending_review_count ?? 0} <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>รายการ</span>
          </div>
        </article>
      </div>

      {/* Split Section */}
      <div className="split">
        {/* Category breakdown */}
        <article className="card">
          <div className="card-header">
            <h3>🏷️ สรุปค่าใช้จ่ายตามหมวดหมู่</h3>
            <Link to="/categories" style={{ fontSize: "0.88rem" }}>ดูทั้งหมด →</Link>
          </div>
          {summary?.expense_by_category && summary.expense_by_category.length > 0 ? (
            <div className="category-bars">
              {summary.expense_by_category.map((item) => {
                const total = Number(item.total);
                const percentOfAllExpense = totalExpenseNum > 0 ? Math.round((total / totalExpenseNum) * 100) : 0;
                const icon = CATEGORY_ICONS[item.category] || "📦";
                return (
                  <div key={item.category} className="bar-row">
                    <div className="bar-info">
                      <span className="bar-category-name">
                        <span>{icon}</span> {item.category} ({percentOfAllExpense}%)
                      </span>
                      <span className="bar-category-total">{formatMoney(item.total)}</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${(total / maxCategory) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>ยังไม่มีข้อมูลรายจ่ายที่ยืนยันแล้ว</p>
            </div>
          )}
        </article>

        {/* Financial health & LINE status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <article className="card">
            <div className="card-header">
              <h3>💡 สถานะงบประมาณ</h3>
            </div>
            {totalIncomeNum > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.92rem" }}>
                  <span>สัดส่วนการใช้จ่ายต่อรายรับ:</span>
                  <b style={{ color: expenseRatio > 80 ? "var(--expense)" : "var(--income)" }}>
                    {expenseRatio}%
                  </b>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.min(expenseRatio, 100)}%`,
                      background: expenseRatio > 80 ? "var(--expense)" : "var(--income)",
                    }}
                  />
                </div>
                <p className="muted" style={{ fontSize: "0.85rem" }}>
                  {expenseRatio < 60
                    ? "🎉 ยอดเยี่ยม! คุณใช้จ่ายอย่างประหยัดและมีเงินออมเหลือ"
                    : expenseRatio <= 85
                    ? "⚖️ อยู่ในเกณฑ์ปานกลาง ควบคุมรายจ่ายส่วนที่ไม่จำเป็น"
                    : "⚠️ รายจ่ายค่อนข้างสูงเมื่อเทียบกับรายรับ ระวังเงินขาดมือ"}
                </p>
              </div>
            ) : (
              <p className="muted">เพิ่มรายรับเพื่อดูอัตราส่วนการใช้จ่าย</p>
            )}
          </article>

          <article className="card">
            <div className="card-header">
              <h3>💬 สถานะ LINE & OCR</h3>
              <Link to="/line" style={{ fontSize: "0.85rem" }}>ตั้งค่า →</Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div className={`status-chip ${line?.status.toLowerCase().replace(/\s+/g, "-")}`}>
                <span className="dot" />
                {line?.status ?? "กำลังตรวจสอบ..."}
              </div>
            </div>
            <p style={{ fontSize: "0.9rem" }}>{line?.message}</p>
            <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.4rem" }}>
              เครื่องมือ OCR: <b>{line?.ocr_provider}</b>
            </p>
            <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.2rem" }}>
              * ระบบอ่านข้อความจากสลิปเท่านั้น ไม่ได้ยืนยันการโอนเงินจริงกับธนาคาร
            </p>
          </article>
        </div>
      </div>

      {/* Pending Reviews Table */}
      <article className="card">
        <div className="card-header">
          <h3>🧾 สลิปรอการตรวจสอบ ({pending.length} รายการ)</h3>
          <Link to="/review" className="primary" style={{ fontSize: "0.85rem", padding: "0.45rem 0.9rem" }}>
            ไปตรวจสอบทั้งหมด →
          </Link>
        </div>
        {pending.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <p>ไม่มีสลิปค้างรอตรวจสอบ ตรวจครบหมดแล้ว!</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>วันที่/เวลาสลิป</th>
                  <th>จำนวนเงินที่อ่านได้</th>
                  <th>ผู้รับ / ผู้โอน</th>
                  <th>ช่องทาง</th>
                  <th>สถานะ</th>
                  <th style={{ textAlign: "right" }}>การกระทำ</th>
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>{formatDateTime(item.transaction_date)}</td>
                    <td className="money-expense">{formatMoney(item.amount)}</td>
                    <td>{item.party_name || <span className="muted">ไม่พบข้อมูล</span>}</td>
                    <td>
                      <span className="tag tag-source">{sourceLabel(item.source)}</span>
                    </td>
                    <td>
                      <span className="status-chip not-configured">{statusLabel(item.status)}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link to="/review" className="primary" style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }}>
                        ตรวจสอบ
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
