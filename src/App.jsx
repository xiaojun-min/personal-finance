import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import TransactionList from "./components/TransactionList";
import Budgets from "./components/Budgets";
import Settings from "./components/Settings";
import Upload from "./components/Upload";
import AddTransaction from "./components/AddTransaction";
import Checklist from "./components/Checklist";
import "./App.css";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_ORDER = Object.fromEntries(MONTH_NAMES.map((m, i) => [m, i + 1]));

function monthLabel(dateStr) {
  const [year, mon] = dateStr.split("-").map(Number);
  return `${MONTH_NAMES[mon - 1]} ${year}`;
}

function monthId(label) {
  return label.replace(/\s+/g, "-").toLowerCase();
}

function monthSortKey(label) {
  const [mon, year] = label.split(" ");
  return parseInt(year) * 100 + (MONTH_ORDER[mon] || 0);
}

// Re-bucket all transactions by their actual date month, newest first.
// Runs on load (migrates old data) and after every upload.
function splitByMonth(statements) {
  const byId = {};
  for (const stmt of statements) {
    for (const txn of stmt.transactions) {
      if (!txn.date) continue;
      const label = monthLabel(txn.date);
      const id = monthId(label);
      if (!byId[id]) byId[id] = { id, month: label, uploadedAt: stmt.uploadedAt, transactions: [] };
      byId[id].transactions.push(txn);
    }
  }
  return Object.values(byId).sort((a, b) => monthSortKey(b.month) - monthSortKey(a.month));
}

function loadStatements() {
  try {
    const raw = JSON.parse(localStorage.getItem("pf_statements") || "[]");
    const migrated = splitByMonth(raw);
    // Persist migration so old data is fixed immediately
    if (JSON.stringify(raw) !== JSON.stringify(migrated)) {
      localStorage.setItem("pf_statements", JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return [];
  }
}

function loadBudget() {
  return parseFloat(localStorage.getItem("pf_budget") || "0") || 0;
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [statements, setStatements] = useState(loadStatements);
  const [budget, setBudget] = useState(loadBudget);
  const [selectedId, setSelectedId] = useState(() => loadStatements()[0]?.id || null);
  const [showUpload, setShowUpload]     = useState(false);
  const [showAddTxn, setShowAddTxn]     = useState(false);
  const [cardUploads, setCardUploads]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("pf_card_uploads") ?? "null") ?? {}; }
    catch { return {}; }
  });

  useEffect(() => {
    const envKey = import.meta.env.ANTHROPIC_API_KEY;
    if (envKey && !localStorage.getItem("anthropic_api_key")) {
      localStorage.setItem("anthropic_api_key", envKey);
    }
  }, []);

  const currentStatement = statements.find((s) => s.id === selectedId) || statements[0] || null;

  function handleUploadComplete({ month, transactions, cardId }) {
    const primaryId = monthId(month);
    setStatements((prev) => {
      const combined = [...prev, { id: primaryId, month, uploadedAt: Date.now(), transactions }];
      const next = splitByMonth(combined);
      localStorage.setItem("pf_statements", JSON.stringify(next));
      return next;
    });
    // Auto-check the card for the statement's month
    if (cardId) {
      setCardUploads((prev) => {
        const next = { ...prev };
        const s = new Set(next[primaryId] || []);
        s.add(cardId);
        next[primaryId] = [...s];
        localStorage.setItem("pf_card_uploads", JSON.stringify(next));
        return next;
      });
    }
    setSelectedId(primaryId);
    setShowUpload(false);
    setTab("dashboard");
  }

  function handleAddTransaction(txn) {
    if (!currentStatement) return;
    setStatements((prev) => {
      const combined = prev.map((s) =>
        s.id === currentStatement.id ? { ...s, transactions: [...s.transactions, txn] } : s
      );
      const next = splitByMonth(combined);
      localStorage.setItem("pf_statements", JSON.stringify(next));
      return next;
    });
  }

  function handleSetBudget(val) {
    setBudget(val);
    localStorage.setItem("pf_budget", val.toString());
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">💰 Finance</h1>
          {statements.length > 0 && (
            <select
              className="month-select"
              value={selectedId || ""}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {statements.map((s) => (
                <option key={s.id} value={s.id}>{s.month}</option>
              ))}
            </select>
          )}
        </div>
        <button className="upload-header-btn" onClick={() => setShowUpload(true)}>
          + Upload
        </button>
      </header>

      <main className="main-content">
        {tab === "dashboard" && (
          <Dashboard statement={currentStatement} budget={budget} />
        )}
        {tab === "transactions" && (
          <TransactionList statement={currentStatement} onAdd={currentStatement ? () => setShowAddTxn(true) : null} />
        )}
        {tab === "budgets" && (
          <Budgets budget={budget} setBudget={handleSetBudget} statement={currentStatement} />
        )}
        {tab === "checklist" && (
          <Checklist
            statement={currentStatement}
            onAddTransaction={handleAddTransaction}
            cardUploads={cardUploads}
            onCardUploadsChange={(next) => {
              setCardUploads(next);
              localStorage.setItem("pf_card_uploads", JSON.stringify(next));
            }}
          />
        )}
        {tab === "settings" && <Settings />}
      </main>

      <nav className="bottom-nav">
        {[
          { id: "dashboard", icon: "📊", label: "Overview" },
          { id: "transactions", icon: "📋", label: "Transactions" },
          { id: "checklist", icon: "✅", label: "Checklist" },
          { id: "budgets", icon: "🎯", label: "Budget" },
          { id: "settings", icon: "⚙️", label: "Settings" },
        ].map(({ id, icon, label }) => (
          <button
            key={id}
            className={`nav-btn ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>

      {showUpload && (
        <Upload onComplete={handleUploadComplete} onClose={() => setShowUpload(false)} />
      )}

      {showAddTxn && (
        <AddTransaction onAdd={handleAddTransaction} onClose={() => setShowAddTxn(false)} />
      )}

      {!currentStatement && !showUpload && (
        <div className="welcome-banner" onClick={() => setShowUpload(true)}>
          <span>📄 Upload your first bank statement to get started →</span>
        </div>
      )}
    </div>
  );
}
