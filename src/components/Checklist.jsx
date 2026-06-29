import { useState } from "react";

const DEFAULT_CARDS = [
  { id: "chase-sapphire", name: "Chase Sapphire Preferred" },
  { id: "chase-unlimited", name: "Chase Unlimited" },
  { id: "bofa", name: "Bank of America" },
  { id: "discover", name: "Discover" },
];

const DEFAULT_BILLS = [
  { id: "rent",        name: "Rent",        recurring: true, keywords: ["rent"] },
  { id: "phone",       name: "Phone",       recurring: true, keywords: ["at&t", "verizon", "t-mobile", "tmobile", "sprint", "visible", "mint mobile"] },
  { id: "internet",    name: "Internet",    recurring: true, keywords: ["comcast", "xfinity", "spectrum", "cox", "frontier", "centurylink"] },
  { id: "electricity", name: "Electricity", recurring: true, keywords: ["pg&e", "sdg&e", "edison", "electric", "utility", "duke energy"] },
];

function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? def; }
  catch { return def; }
}

function persist(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function findCovering(bill, transactions) {
  for (const txn of transactions) {
    if (txn.type !== "debit") continue;
    const desc = txn.description.toLowerCase();
    if (bill.keywords.some((kw) => desc.includes(kw))) return txn;
  }
  return null;
}

export default function Checklist({ statement }) {
  const monthId = statement?.id || "";
  const transactions = statement?.transactions || [];

  const [cards, setCards]           = useState(() => load("pf_cards", DEFAULT_CARDS));
  const [bills, setBills]           = useState(() => load("pf_bills", DEFAULT_BILLS));
  const [cardUploads, setCardUploads] = useState(() => load("pf_card_uploads", {}));
  const [billManual, setBillManual] = useState(() => load("pf_bill_manual", {}));

  const uploadedSet = new Set(cardUploads[monthId] || []);
  const manualSet   = new Set(billManual[monthId]  || []);

  // ── Card helpers ──────────────────────────────────────────────
  function toggleCard(id) {
    const next = { ...cardUploads };
    const s = new Set(next[monthId] || []);
    s.has(id) ? s.delete(id) : s.add(id);
    next[monthId] = [...s];
    setCardUploads(next);
    persist("pf_card_uploads", next);
  }

  // ── Bill helpers ──────────────────────────────────────────────
  function toggleManual(id) {
    const next = { ...billManual };
    const s = new Set(next[monthId] || []);
    s.has(id) ? s.delete(id) : s.add(id);
    next[monthId] = [...s];
    setBillManual(next);
    persist("pf_bill_manual", next);
  }

  function toggleRecurring(id) {
    const next = bills.map((b) => b.id === id ? { ...b, recurring: !b.recurring } : b);
    setBills(next);
    persist("pf_bills", next);
  }

  // ── Add bill form ─────────────────────────────────────────────
  const [showAdd, setShowAdd]           = useState(false);
  const [newName, setNewName]           = useState("");
  const [newKeyword, setNewKeyword]     = useState("");
  const [newRecurring, setNewRecurring] = useState(true);

  function submitBill(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const bill = {
      id: `bill-${Date.now()}`,
      name: newName.trim(),
      recurring: newRecurring,
      keywords: newKeyword.trim() ? [newKeyword.trim().toLowerCase()] : [],
    };
    const next = [...bills, bill];
    setBills(next);
    persist("pf_bills", next);
    setNewName(""); setNewKeyword(""); setNewRecurring(true); setShowAdd(false);
  }

  // ── Counts ────────────────────────────────────────────────────
  const cardsDone = cards.filter((c) => uploadedSet.has(c.id)).length;
  const billsDone = bills.filter((b) => findCovering(b, transactions) || manualSet.has(b.id)).length;

  if (!statement) {
    return (
      <div className="empty-dashboard">
        <span className="empty-icon">✅</span>
        <p>Upload a statement to start tracking your checklist.</p>
      </div>
    );
  }

  return (
    <div className="checklist-page">

      {/* ── Statements ── */}
      <div className="checklist-section">
        <div className="checklist-section-header">
          <span className="section-title">Statements</span>
          <span className="checklist-progress">{cardsDone}/{cards.length} uploaded</span>
        </div>
        <div className="checklist-list">
          {cards.map((card) => {
            const checked = uploadedSet.has(card.id);
            return (
              <label key={card.id} className={`checklist-row ${checked ? "done" : ""}`}>
                <input
                  type="checkbox"
                  className="checklist-checkbox"
                  checked={checked}
                  onChange={() => toggleCard(card.id)}
                />
                <span className="checklist-name">{card.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Bills & Utilities ── */}
      <div className="checklist-section">
        <div className="checklist-section-header">
          <span className="section-title">Bills & Utilities</span>
          <span className="checklist-progress">{billsDone}/{bills.length} covered</span>
        </div>
        <div className="checklist-list">
          {bills.map((bill) => {
            const covering = findCovering(bill, transactions);
            const done = !!(covering || manualSet.has(bill.id));
            return (
              <div key={bill.id} className={`checklist-row ${done ? "done" : ""}`}>
                <input
                  type="checkbox"
                  className="checklist-checkbox"
                  checked={done}
                  onChange={() => !covering && toggleManual(bill.id)}
                  style={covering ? { pointerEvents: "none" } : {}}
                />
                <div className="checklist-bill-info">
                  <span className="checklist-name">{bill.name}</span>
                  {covering && (
                    <span className="checklist-auto-note">
                      Auto-detected · {covering.description} · {fmt(covering.amount)}
                    </span>
                  )}
                </div>
                <button
                  className={`recurring-btn ${bill.recurring ? "active" : ""}`}
                  onClick={() => toggleRecurring(bill.id)}
                  title={bill.recurring ? "Recurring (tap to remove)" : "Mark as recurring"}
                >
                  {bill.recurring ? "🔄 Recurring" : "🔄 One-time"}
                </button>
              </div>
            );
          })}
        </div>

        {showAdd ? (
          <form onSubmit={submitBill} className="add-bill-form">
            <input
              className="settings-input"
              placeholder="Bill name (e.g. Water, Gas)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <input
              className="settings-input"
              placeholder="Keyword to auto-detect (e.g. EBMUD, PG&E)"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
            />
            <label className="recurring-label">
              <input
                type="checkbox"
                checked={newRecurring}
                onChange={(e) => setNewRecurring(e.target.checked)}
              />
              <span>Recurring every month</span>
            </label>
            <div className="add-bill-actions">
              <button type="button" className="cancel-btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="save-btn">Add</button>
            </div>
          </form>
        ) : (
          <button className="add-bill-btn" onClick={() => setShowAdd(true)}>+ Add bill</button>
        )}
      </div>
    </div>
  );
}
