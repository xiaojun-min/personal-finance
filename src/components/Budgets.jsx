import { useState } from "react";

function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function Budgets({ budget, setBudget, statement }) {
  const [input, setInput] = useState(budget > 0 ? budget.toString() : "");

  const totalSpent = statement
    ? statement.transactions
        .filter((t) => t.type === "debit")
        .reduce((s, t) => s + t.amount, 0)
    : 0;

  const remaining = budget - totalSpent;
  const over = budget > 0 && totalSpent > budget;
  const pct = budget > 0 ? Math.min(100, (totalSpent / budget) * 100) : 0;

  function handleSave() {
    const val = parseFloat(input) || 0;
    setBudget(val);
    setInput(val > 0 ? val.toString() : "");
  }

  return (
    <div className="budgets-page">
      <div className="budget-goal-card">
        <div className="budget-goal-header">
          <span className="budget-goal-icon">🎯</span>
          <div>
            <h2 className="budget-goal-title">Monthly Budget</h2>
            <p className="budget-goal-desc">Set your total spending goal for the month</p>
          </div>
        </div>

        <div className="budget-goal-input-row">
          <div className="budget-input-wrap big">
            <span className="dollar-sign big">$</span>
            <input
              type="number"
              min="0"
              step="100"
              className="budget-input big"
              placeholder="e.g. 3000"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <button className="save-btn" onClick={handleSave}>Set</button>
        </div>

        {budget > 0 && statement && (
          <div className="budget-status-block">
            <div className="budget-status-row">
              <span className="budget-status-label">Spent so far</span>
              <span className="budget-status-value">{fmt(totalSpent)}</span>
            </div>
            <div className="budget-status-row">
              <span className="budget-status-label">{over ? "Over budget by" : "Remaining"}</span>
              <span className={`budget-status-value ${over ? "over" : "ok"}`}>
                {fmt(Math.abs(remaining))}
              </span>
            </div>
            <div className="budget-bar-track" style={{ marginTop: 8 }}>
              <div
                className="budget-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: over ? "var(--danger)" : pct > 80 ? "var(--warning)" : "var(--primary)",
                }}
              />
            </div>
            <div className="budget-pct-label">{Math.round(pct)}% of budget used</div>
          </div>
        )}

        {budget > 0 && !statement && (
          <p className="budget-no-data">Upload a statement to see how you&apos;re tracking.</p>
        )}
      </div>
    </div>
  );
}
