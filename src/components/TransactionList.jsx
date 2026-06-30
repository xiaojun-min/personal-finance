import { useState } from "react";
import { CATEGORIES } from "../constants";

const DEFAULT_CARDS = [
  { id: "chase-sapphire",  name: "Chase Sapphire" },
  { id: "chase-unlimited", name: "Chase Unlimited" },
  { id: "bofa",            name: "Bank of America" },
  { id: "discover",        name: "Discover" },
];

function loadCards() {
  try { return JSON.parse(localStorage.getItem("pf_cards") ?? "null") ?? DEFAULT_CARDS; }
  catch { return DEFAULT_CARDS; }
}

function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const SORT_OPTIONS = [
  { value: "date-desc",    label: "Date: newest first" },
  { value: "date-asc",     label: "Date: oldest first" },
  { value: "amount-desc",  label: "Amount: high → low" },
  { value: "amount-asc",   label: "Amount: low → high" },
  { value: "category",     label: "Category" },
  { value: "description",  label: "Description" },
];

function applySortAndFilter(transactions, filter, sort) {
  const filtered = filter === "All"
    ? transactions
    : transactions.filter((t) => (t.category || "Other") === filter);

  return [...filtered].sort((a, b) => {
    switch (sort) {
      case "date-asc":    return a.date.localeCompare(b.date);
      case "amount-desc": return b.amount - a.amount;
      case "amount-asc":  return a.amount - b.amount;
      case "category":    return (a.category || "Other").localeCompare(b.category || "Other");
      case "description": return a.description.localeCompare(b.description);
      default:            return b.date.localeCompare(a.date);
    }
  });
}

export default function TransactionList({ statement, onAdd }) {
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("date-desc");
  const cards = loadCards();
  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c.name]));

  if (!statement) {
    return (
      <div className="empty-dashboard">
        <span className="empty-icon">📋</span>
        <p>No transactions yet. Upload a bank statement.</p>
      </div>
    );
  }

  const categories = ["All", ...new Set(statement.transactions.map((t) => t.category || "Other"))].sort();
  const result = applySortAndFilter(statement.transactions, filter, sort);

  return (
    <div className="transactions-page">
      <div className="filter-bar">
        <div className="filter-row">
          <select className="category-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="filter-meta">
          <span className="txn-count">{result.length} transactions</span>
          {onAdd && <button className="add-txn-btn" onClick={onAdd}>+ Add</button>}
        </div>
      </div>

      <div className="txn-list">
        {result.map((t) => {
          const cat = CATEGORIES[t.category] || CATEGORIES["Other"];
          return (
            <div key={t.id} className="txn-row">
              <span className="txn-emoji">{cat.emoji}</span>
              <div className="txn-details">
                <span className="txn-desc">{t.description}</span>
                <span className="txn-meta">
                  {t.date} · {t.category || "Other"}
                  {t.cardId && cardMap[t.cardId] ? ` · ${cardMap[t.cardId]}` : ""}
                </span>
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
