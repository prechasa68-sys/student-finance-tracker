import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSummary, fetchTransactions } from "../api";
import { formatDateTime, formatMoney } from "../format";
import type { DashboardSummary, Transaction } from "../types";

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
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState("");

  const loadAll = () => {
    Promise.all([
      fetchSummary(),
      fetchTransactions({ status: "confirmed" }),
    ])
      .then(([summaryData, txData]) => {
        setSummary(summaryData);
        setRecentTransactions(txData.slice(0, 5));
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const totalExpenseNum = Number(summary?.expense_total || 0);
  const totalIncomeNum = Number(summary?.income_total || 0);
  const expenseRatio = totalIncomeNum > 0 ? Math.round((totalExpenseNum / totalIncomeNum) * 100) : 0;

  const maxCategory = Math.max(
    ...(summary?.expense_by_category.map((item) => Number(item.total)) ?? [0]),
    1,
  );

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div className="page-heading">
        <div className="heading-info">
          <h2>📊 ภาพรวมการเงินส่วนตัว</h2>
          <p>ติดตามรายรับ รายจ่าย ยอดคงเหลือ และพฤติกรรมการใช้เงินของคุณ</p>
        </div>
        <div className="heading-actions">
          <Link className="primary" to="/transactions" style={{ fontSize: "0.95rem", padding: "0.55rem 1.1rem" }}>
            ➕ บันทึกรายรับ/รายจ่าย
          </Link>
        </div>
      </div>

      {error ? <div className="error-banner">⚠️ {error}</div> : null}

      {/* Main 3 Stat Cards */}
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
            <span className="stat-label">ยอดเงินคงเหลือสุทธิ</span>
            <div className="stat-icon">🏦</div>
          </div>
          <div className="stat-amount">{formatMoney(summary?.balance)}</div>
        </article>
      </div>

      {/* Middle Split: Category Breakdown + Budget Health */}
      <div className="split">
        {/* Category breakdown */}
        <article className="card">
          <div className="card-header">
            <h3>🏷️ สรุปค่าใช้จ่ายตามหมวดหมู่</h3>
            <Link to="/categories" style={{ fontSize: "0.88rem" }}>
              ดูสัดส่วนทั้งหมด →
            </Link>
          </div>
          {summary?.expense_by_category && summary.expense_by_category.length > 0 ? (
            <div className="category-bars">
              {summary.expense_by_category.map((item) => {
                const total = Number(item.total);
                const percentOfAllExpense =
                  totalExpenseNum > 0 ? Math.round((total / totalExpenseNum) * 100) : 0;
                const icon =
                  CATEGORY_ICONS[item.category] ||
                  (item.category.startsWith("อื่น") ? "📦" : "🏷️");
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
              <p>ยังไม่มีข้อมูลรายจ่ายที่บันทึกไว้</p>
            </div>
          )}
        </article>

        {/* Financial health */}
        <article className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card-header">
            <h3>💡 สถานะงบประมาณ</h3>
          </div>
          {totalIncomeNum > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                <span>สัดส่วนการใช้จ่ายต่อรายรับ:</span>
                <b style={{ color: expenseRatio > 80 ? "var(--expense)" : "var(--income)" }}>
                  {expenseRatio}%
                </b>
              </div>
              <div className="bar-track" style={{ height: "10px" }}>
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.min(expenseRatio, 100)}%`,
                    background: expenseRatio > 80 ? "var(--expense)" : "var(--income)",
                  }}
                />
              </div>
              <p className="muted" style={{ fontSize: "0.88rem", lineHeight: 1.5 }}>
                {expenseRatio < 60
                  ? "🎉 ยอดเยี่ยมมาก! คุณใช้จ่ายอย่างประหยัดและมีเงินออมเหลือสะสม"
                  : expenseRatio <= 85
                  ? "⚖️ อยู่ในเกณฑ์ปานกลาง วางแผนควบคุมรายจ่ายที่ไม่จำเป็น"
                  : "⚠️ รายจ่ายสูงเกิน 80% ของรายรับ ควรชะลอการใช้จ่าย"}
              </p>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <p>เพิ่มรายการรายรับเพื่อวิเคราะห์สุขภาพทางการเงิน</p>
            </div>
          )}

          <div
            style={{
              marginTop: "auto",
              padding: "0.85rem",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              fontSize: "0.85rem",
              color: "var(--muted)",
            }}
          >
            💡 <b>เคล็ดลับ:</b> คุณสามารถจดบันทึกรายรับหรือรายจ่ายได้ทันทีใน 5 วินาทีที่เมนู "รายการธุรกรรม"
          </div>
        </article>
      </div>

      {/* Recent Transactions List */}
      <article className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: "1.25rem 1.25rem 0.5rem" }}>
          <h3>⏱️ รายการล่าสุด (5 รายการ)</h3>
          <Link to="/transactions" className="outline" style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}>
            ดูรายการทั้งหมด →
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p>ยังไม่มีรายการธุรกรรม กดปุ่ม "➕ บันทึกรายรับ/รายจ่าย" ด้านบนเพื่อเริ่มจดได้เลย</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>ประเภท</th>
                  <th>หมวดหมู่</th>
                  <th>จำนวนเงิน</th>
                  <th>รายละเอียด / หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((item) => (
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
                        {item.type === "income" ? "🔺 รายรับ" : "🔻 รายจ่าย"}
                      </span>
                    </td>
                    <td>
                      <span className="tag tag-category">
                        {CATEGORY_ICONS[item.category ?? ""] ||
                          (item.category?.startsWith("อื่น") ? "📦" : "🏷️")}{" "}
                        {item.category ?? "-"}
                      </span>
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
                      >
                        {item.type === "income" ? "+" : "-"}
                        {formatMoney(item.amount)}
                      </span>
                    </td>
                    <td>{item.note || <span className="muted">-</span>}</td>
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
