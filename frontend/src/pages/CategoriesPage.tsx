import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCategories, fetchTransactions } from "../api";
import { formatMoney } from "../format";
import type { Transaction } from "../types";

const CATEGORY_ICONS: Record<string, string> = {
  อาหาร: "🍔",
  เดินทาง: "🚗",
  การเรียน: "📚",
  ที่พัก: "🏠",
  ช้อปปิ้ง: "🛍️",
  รายได้: "💰",
  "อื่น ๆ": "📦",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  อาหาร: "ค่าอาหาร ขนม กาแฟ เครื่องดื่มประจำวัน",
  เดินทาง: "ค่ารถเมล์ BTS MRT วินมอเตอร์ไซค์ ค่าน้ำมัน",
  การเรียน: "ค่าหนังสือ ชีท เอกสาร อุปกรณ์การเรียน ค่าเทอม",
  ที่พัก: "ค่าเช่าหอพัก ค่าน้ำ ค่าไฟ ค่าอินเทอร์เน็ต",
  ช้อปปิ้ง: "เสื้อผ้า ของใช้ส่วนตัว ของใช้จำเป็น",
  รายได้: "เงินเดือนพาร์ทไทม์ เงินผู้ปกครอง ทุนการศึกษา",
  "อื่น ๆ": "ค่าใช้จ่ายเบ็ดเตล็ดหรือรายการอื่นๆ",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<Transaction[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchCategories(), fetchTransactions({ status: "confirmed" })])
      .then(([categoryData, transactionData]) => {
        setCategories(categoryData.categories);
        setItems(transactionData);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const totalAllExpense = useMemo(() => {
    return items
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  }, [items]);

  const allCategories = useMemo(() => {
    const set = new Set([...categories]);
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [categories, items]);

  const totals = useMemo(() => {
    return allCategories.map((category) => {
      const related = items.filter((item) => item.category === category);
      const income = related
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
      const expense = related
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
      const percent = totalAllExpense > 0 ? Math.round((expense / totalAllExpense) * 100) : 0;
      return { category, income, expense, count: related.length, percent };
    });
  }, [allCategories, items, totalAllExpense]);

  const maxExpense = Math.max(...totals.map((t) => t.expense), 0);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-heading">
        <div className="heading-info">
          <h2>🏷️ หมวดหมู่ค่าใช้จ่าย & รายรับ</h2>
          <p>
            วิเคราะห์พฤติกรรมการใช้จ่ายของนักศึกษา แยกตามหมวดหมู่ อาหาร เดินทาง การเรียน ที่พัก ช้อปปิ้ง รายได้
          </p>
        </div>
        <div className="heading-actions">
          <Link to="/transactions" className="primary">
            + บันทึกรายการใหม่
          </Link>
        </div>
      </div>

      {error ? <div className="error-banner">⚠️ {error}</div> : null}

      <div className="category-grid">
        {totals.map((item) => {
          const icon = CATEGORY_ICONS[item.category] || (item.category.startsWith("อื่น") ? "📦" : "🏷️");
          const desc = CATEGORY_DESCRIPTIONS[item.category] || "";
          const isTop = item.expense > 0 && item.expense === maxExpense;

          return (
            <article className="category-card" key={item.category}>
              <div className="category-card-top">
                <div className="category-icon">{icon}</div>
                {isTop && item.category !== "รายได้" ? (
                  <span className="tag tag-expense" style={{ fontSize: "0.72rem" }}>
                    🔥 ใช้จ่ายสูงสุด
                  </span>
                ) : (
                  <span className="tag tag-source">{item.count} รายการ</span>
                )}
              </div>

              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {item.category}
                </h3>
                <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.2rem" }}>
                  {desc}
                </p>
              </div>

              <div className="category-stats">
                {item.category === "รายได้" ? (
                  <div className="cat-stat-row">
                    <span>รายรับรวม:</span>
                    <b className="money-income">+{formatMoney(item.income)}</b>
                  </div>
                ) : (
                  <>
                    <div className="cat-stat-row">
                      <span>ยอดใช้จ่าย:</span>
                      <b className="money-expense">-{formatMoney(item.expense)}</b>
                    </div>
                    <div className="cat-stat-row">
                      <span>สัดส่วน:</span>
                      <b>{item.percent}% ของรายจ่ายทั้งหมด</b>
                    </div>
                    <div className="bar-track" style={{ marginTop: "0.4rem" }}>
                      <div
                        className="bar-fill"
                        style={{
                          width: `${item.percent}%`,
                          background: isTop ? "var(--expense)" : "var(--brand)",
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: "auto", paddingTop: "0.75rem" }}>
                <Link
                  to={`/transactions?category=${encodeURIComponent(item.category)}`}
                  style={{ fontSize: "0.85rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                >
                  ดูรายการในหมวดนี้ →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
