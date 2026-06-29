import { useState } from "react";
import Dashboard from "./components/Dashboard";
import TransactionList from "./components/TransactionList";
import Budgets from "./components/Budgets";
import Settings from "./components/Settings";
import Upload from "./components/Upload";
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

  const currentStatement = statements.find((s) => s.id === selectedId) || statements[0] || null;

  function handleUploadComplete({ month, transactions }) {
    const id = month.replace(/\s+/g, "-").toLowerCase();
    const newStatement = { id, month, uploadedAt: Date.now(), transactions };
    setStatements((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      const next = [newStatement, ...filtered];
      localStorage.setItem("pf_statements", JSON.stringify(next));
      return next;
    });
    setSelectedId(id);
    setShowUpload(false);
    setTab("dashboard");
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
          <TransactionList statement={currentStatement} />
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

      {!currentStatement && !showUpload && (
        <div className="welcome-banner" onClick={() => setShowUpload(true)}>
          <span>📄 Upload your first bank statement to get started →</span>
        </div>
      )}
    </div>
  );
}
