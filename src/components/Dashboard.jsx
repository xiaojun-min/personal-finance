import { CATEGORIES } from "../constants";

function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function CategoryRow({ name, spent, transactionCount }) {
  const cat = CATEGORIES[name] || CATEGORIES["Other"];
  return (
    <div className="category-row">
      <span className="cat-emoji">{cat.emoji}</span>
      <div className="cat-info">
        <span className="cat-name">{name}</span>
        <span className="cat-count">{transactionCount} transaction{transactionCount !== 1 ? "s" : ""}</span>
      </div>
      <span className="cat-spent">{fmt(spent)}</span>
    </div>
  );
}

export default function Dashboard({ statement, budget }) {
  if (!statement) {
    return (
      <div className="empty-dashboard">
        <span className="empty-icon">📊</span>
        <p>No data yet. Upload a bank statement to get started.</p>
      </div>
    );
  }

  const debits = statement.transactions.filter((t) => t.type === "debit");
  const credits = statement.transactions.filter((t) => t.type === "credit");
  const totalSpent = debits.reduce((s, t) => s + t.amount, 0);
  const totalIncome = credits.reduce((s, t) => s + t.amount, 0);
  const remaining = budget - totalSpent;
  const over = budget > 0 && totalSpent > budget;
  const pct = budget > 0 ? Math.min(100, (totalSpent / budget) * 100) : 0;

  const byCategory = {};
  for (const t of debits) {
    const cat = t.category || "Other";
    if (!byCategory[cat]) byCategory[cat] = { spent: 0, count: 0 };
    byCategory[cat].spent += t.amount;
    byCategory[cat].count += 1;
  }
  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1].spent - a[1].spent);

  return (
    <div className="dashboard">
      {/* Summary cards */}
      <div className="summary-cards">
        <div className="summary-card spent">
          <span className="summary-label">Spent</span>
          <span className="summary-value">{fmt(totalSpent)}</span>
        </div>
        <div className="summary-card income">
          <span className="summary-label">Income</span>
          <span className="summary-value">{fmt(totalIncome)}</span>
        </div>
        {budget > 0 && (
          <div className={`summary-card ${over ? "over" : "budget"}`}>
            <span className="summary-label">{over ? "Over by" : "Remaining"}</span>
            <span className="summary-value">{fmt(Math.abs(remaining))}</span>
          </div>
        )}
      </div>

      {/* Budget bar */}
      {budget > 0 && (
        <div className="overall-budget-bar">
          <div className="overall-budget-labels">
            <span>Monthly budget: {fmt(budget)}</span>
            <span className={over ? "over" : ""}>{Math.round(pct)}% used</span>
          </div>
          <div className="budget-bar-track">
            <div
              className="budget-bar-fill"
              style={{
                width: `${pct}%`,
                background: over ? "var(--danger)" : pct > 80 ? "var(--warning)" : "var(--primary)",
              }}
            />
          </div>
        </div>
      )}

      {/* Categories */}
      <h3 className="section-title">By Category</h3>
      <div className="categories-list">
        {sortedCategories.map(([name, data]) => (
          <CategoryRow
            key={name}
            name={name}
            spent={data.spent}
            transactionCount={data.count}
          />
        ))}
      </div>
    </div>
  );
}
