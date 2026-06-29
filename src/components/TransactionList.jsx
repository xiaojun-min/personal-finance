import { useState } from "react";
import { CATEGORIES } from "../constants";

function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function TransactionList({ statement, onAdd }) {
  const [filter, setFilter] = useState("All");

  if (!statement) {
    return (
      <div className="empty-dashboard">
        <span className="empty-icon">📋</span>
        <p>No transactions yet. Upload a bank statement.</p>
      </div>
    );
  }

  const categories = ["All", ...new Set(statement.transactions.map((t) => t.category || "Other"))].sort();
  const filtered = filter === "All"
    ? statement.transactions
    : statement.transactions.filter((t) => (t.category || "Other") === filter);

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="transactions-page">
      <div className="filter-bar">
        <select
          className="category-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="txn-count">{sorted.length} transactions</span>
        {onAdd && (
          <button className="add-txn-btn" onClick={onAdd}>+ Add</button>
        )}
      </div>

      <div className="txn-list">
        {sorted.map((t) => {
          const cat = CATEGORIES[t.category] || CATEGORIES["Other"];
          return (
            <div key={t.id} className="txn-row">
              <span className="txn-emoji">{cat.emoji}</span>
              <div className="txn-details">
                <span className="txn-desc">{t.description}</span>
                <span className="txn-meta">{t.date} · {t.category || "Other"}</span>
              </div>
              <span className={`txn-amount ${t.type === "credit" ? "credit" : "debit"}`}>
                {t.type === "credit" ? "+" : "-"}{fmt(t.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
