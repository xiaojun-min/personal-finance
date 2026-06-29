import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import TransactionList from "./components/TransactionList";
import Budgets from "./components/Budgets";
import Settings from "./components/Settings";
import Upload from "./components/Upload";
import AddTransaction from "./components/AddTransaction";
import "./App.css";

function loadStatements() {
  try { return JSON.parse(localStorage.getItem("pf_statements") || "[]"); }
  catch { return []; }
}

function loadBudget() {
  return parseFloat(localStorage.getItem("pf_budget") || "0") || 0;
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [statements, setStatements] = useState(loadStatements);
  const [budget, setBudget] = useState(loadBudget);
  const [selectedId, setSelectedId] = useState(() => loadStatements()[0]?.id || null);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddTxn, setShowAddTxn] = useState(false);

  useEffect(() => {
    const envKey = import.meta.env.ANTHROPIC_API_KEY;
    if (envKey && !localStorage.getItem("anthropic_api_key")) {
      localStorage.setItem("anthropic_api_key", envKey);
    }
  }, []);

  const currentStatement = statements.find((s) => s.id === selectedId) || statements[0] || null;

  function handleUploadComplete({ month, transactions }) {
    // Group transactions by their actual transaction date, not the statement month
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const byMonth = {};
    for (const txn of transactions) {
      const [year, mon] = txn.date.split("-").map(Number);
      const label = `${MONTHS[mon - 1]} ${year}`;
      const id = label.replace(/\s+/g, "-").toLowerCase();
      if (!byMonth[id]) byMonth[id] = { id, month: label, transactions: [] };
      byMonth[id].transactions.push(txn);
    }

    // Pick the month to navigate to after upload (prefer statement month, else most recent)
    const primaryId = month.replace(/\s+/g, "-").toLowerCase();
    const navigateTo = byMonth[primaryId] ? primaryId : Object.keys(byMonth)[0];

    setStatements((prev) => {
      let next = [...prev];
      for (const { id, month: label, transactions: txns } of Object.values(byMonth)) {
        const existing = next.find((s) => s.id === id);
        const merged = existing
          ? { ...existing, transactions: [...existing.transactions, ...txns] }
          : { id, month: label, uploadedAt: Date.now(), transactions: txns };
        next = [merged, ...next.filter((s) => s.id !== id)];
      }
      localStorage.setItem("pf_statements", JSON.stringify(next));
      return next;
    });
    setSelectedId(navigateTo);
    setShowUpload(false);
    setTab("dashboard");
  }

  function handleAddTransaction(txn) {
    if (!currentStatement) return;
    setStatements((prev) => {
      const next = prev.map((s) =>
        s.id === currentStatement.id
          ? { ...s, transactions: [...s.transactions, txn] }
          : s
      );
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
          {statements.length > 1 ? (
            <select
              className="month-select"
              value={selectedId || ""}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {statements.map((s) => (
                <option key={s.id} value={s.id}>{s.month}</option>
              ))}
            </select>
          ) : currentStatement ? (
            <span className="month-label">{currentStatement.month}</span>
          ) : null}
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
        {tab === "settings" && <Settings />}
      </main>

      <nav className="bottom-nav">
        {[
          { id: "dashboard", icon: "📊", label: "Overview" },
          { id: "transactions", icon: "📋", label: "Transactions" },
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
