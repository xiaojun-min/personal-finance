import { useState } from "react";

const DEFAULT_CARDS = [
  { id: "chase-sapphire",  name: "Chase Sapphire Preferred" },
  { id: "chase-unlimited", name: "Chase Unlimited" },
  { id: "bofa",            name: "Bank of America" },
  { id: "discover",        name: "Discover" },
];

const DEFAULT_BILLS = [
  { id: "rent",        name: "Rent",        recurring: true, keywords: ["rent"] },
  { id: "phone",       name: "Phone",       recurring: true, keywords: ["at&t", "verizon", "t-mobile", "tmobile", "sprint", "visible"] },
  { id: "internet",    name: "Internet",    recurring: true, keywords: ["comcast", "xfinity", "spectrum", "cox", "frontier"] },
  { id: "electricity", name: "Electricity", recurring: true, keywords: ["pg&e", "sdg&e", "edison", "electric", "utility"] },
];

function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? def; }
  catch { return def; }
}

function persist(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function today() { return new Date().toISOString().slice(0, 10); }

function findCovering(bill, transactions) {
  for (const txn of transactions) {
    if (txn.type !== "debit") continue;
    const desc = txn.description.toLowerCase();
    if (bill.keywords.some((kw) => desc.includes(kw))) return txn;
  }
  return null;
}

// ── Edit bill modal ───────────────────────────────────────────────────────────
function EditBillModal({ bill, onSave, onDelete, onClose }) {
  const [name, setName]           = useState(bill.name);
  const [keyword, setKeyword]     = useState(bill.keywords[0] || "");
  const [recurring, setRecurring] = useState(bill.recurring);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ ...bill, name: name.trim(), recurring, keywords: keyword.trim() ? [keyword.trim().toLowerCase()] : bill.keywords });
  }

  return (
    <div className="upload-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="upload-modal">
        <div className="upload-modal-header">
          <h2>Edit Bill</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="add-txn-form">
          <div className="add-txn-field">
            <label className="add-txn-label">Name</label>
            <input className="settings-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="add-txn-field">
            <label className="add-txn-label">Auto-detect keyword</label>
            <input
              className="settings-input"
              placeholder="e.g. COMCAST, PG&E"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <span className="upload-hint">Matches descriptions in your imported transactions</span>
          </div>
          <label className="recurring-label">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            <span>Recurring every month</span>
          </label>
          <button type="submit" className="save-btn">Save changes</button>
          <button type="button" className="delete-bill-btn" onClick={() => onDelete(bill.id)}>
            Delete bill
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Checklist({ statement, onAddTransaction }) {
  const monthId     = statement?.id || "";
  const transactions = statement?.transactions || [];

  const [cards, setCards]             = useState(() => load("pf_cards", DEFAULT_CARDS));
  const [bills, setBills]             = useState(() => load("pf_bills", DEFAULT_BILLS));
  const [cardUploads, setCardUploads] = useState(() => load("pf_card_uploads", {}));
  // { monthId: { billId: { amount, date } } }
  const [billManual, setBillManual]   = useState(() => load("pf_bill_manual", {}));

  const uploadedSet = new Set(cardUploads[monthId] || []);
  const manualData  = billManual[monthId] || {};

  // ── Card helpers ────────────────────────────────────────────
  function toggleCard(id) {
    const next = { ...cardUploads };
    const s = new Set(next[monthId] || []);
    s.has(id) ? s.delete(id) : s.add(id);
    next[monthId] = [...s];
    setCardUploads(next);
    persist("pf_card_uploads", next);
  }

  // ── Inline pay form ─────────────────────────────────────────
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate]   = useState(today());

  function openPay(id) { setPayingId(id); setPayAmount(""); setPayDate(today()); }
  function cancelPay() { setPayingId(null); }

  function savePay(bill) {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;

    // Create a real transaction so it shows in dashboard & transactions tab
    onAddTransaction?.({
      id: `manual-${Date.now()}`,
      date: payDate,
      description: bill.name,
      amount: amt,
      type: "debit",
      category: "Utilities & Bills",
    });

    // Store the amount+date in the checklist so this month shows as done
    const next = { ...billManual, [monthId]: { ...manualData, [bill.id]: { amount: amt, date: payDate } } };
    setBillManual(next);
    persist("pf_bill_manual", next);
    setPayingId(null);
  }

  function clearManual(billId) {
    const { [billId]: _, ...rest } = manualData;
    const next = { ...billManual, [monthId]: rest };
    setBillManual(next);
    persist("pf_bill_manual", next);
  }

  // ── Edit / delete bill ──────────────────────────────────────
  const [editingBill, setEditingBill] = useState(null);

  function saveBillEdit(updated) {
    const next = bills.map((b) => b.id === updated.id ? updated : b);
    setBills(next); persist("pf_bills", next); setEditingBill(null);
  }

  function deleteBill(id) {
    const next = bills.filter((b) => b.id !== id);
    setBills(next); persist("pf_bills", next); setEditingBill(null);
  }

  function toggleRecurring(id) {
    const next = bills.map((b) => b.id === id ? { ...b, recurring: !b.recurring } : b);
    setBills(next); persist("pf_bills", next);
  }

  // ── Add bill form ───────────────────────────────────────────
  const [showAdd, setShowAdd]           = useState(false);
  const [newName, setNewName]           = useState("");
  const [newKeyword, setNewKeyword]     = useState("");
  const [newRecurring, setNewRecurring] = useState(true);

  function submitBill(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const bill = { id: `bill-${Date.now()}`, name: newName.trim(), recurring: newRecurring, keywords: newKeyword.trim() ? [newKeyword.trim().toLowerCase()] : [] };
    const next = [...bills, bill];
    setBills(next); persist("pf_bills", next);
    setNewName(""); setNewKeyword(""); setNewRecurring(true); setShowAdd(false);
  }

  // ── Progress ────────────────────────────────────────────────
  const cardsDone = cards.filter((c) => uploadedSet.has(c.id)).length;
  const billsDone = bills.filter((b) => findCovering(b, transactions) || manualData[b.id]).length;

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

      {/* ── Statements ─────────────────────────────────────── */}
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
                <input type="checkbox" className="checklist-checkbox" checked={checked} onChange={() => toggleCard(card.id)} />
                <span className="checklist-name">{card.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Bills & Utilities ──────────────────────────────── */}
      <div className="checklist-section">
        <div className="checklist-section-header">
          <span className="section-title">Bills & Utilities</span>
          <span className="checklist-progress">{billsDone}/{bills.length} covered</span>
        </div>

        <div className="checklist-list">
          {bills.map((bill) => {
            const covering  = findCovering(bill, transactions);
            const manual    = manualData[bill.id];
            const done      = !!(covering || manual);
            const isPaying  = payingId === bill.id;

            return (
              <div key={bill.id} className={`checklist-bill-block ${done ? "done" : ""}`}>
                {/* Main row */}
                <div className="checklist-row">
                  <input
                    type="checkbox"
                    className="checklist-checkbox"
                    checked={done}
                    onChange={() => {
                      if (covering) return;          // auto-detected — read-only
                      if (manual)   clearManual(bill.id);
                      else          openPay(bill.id);
                    }}
                    style={covering ? { pointerEvents: "none" } : {}}
                  />

                  <div className="checklist-bill-info">
                    <span className="checklist-name">{bill.name}</span>
                    {covering && (
                      <span className="checklist-auto-note">
                        Auto-detected · {covering.description} · {fmt(covering.amount)}
                      </span>
                    )}
                    {manual && !covering && (
                      <span className="checklist-manual-note">
                        Paid · {fmt(manual.amount)} · {manual.date}
                      </span>
                    )}
                    {!done && !isPaying && (
                      <button className="enter-amount-btn" onClick={() => openPay(bill.id)}>
                        Tap to enter amount
                      </button>
                    )}
                  </div>

                  <div className="checklist-row-actions">
                    <button
                      className={`recurring-btn ${bill.recurring ? "active" : ""}`}
                      onClick={() => toggleRecurring(bill.id)}
                      title={bill.recurring ? "Recurring" : "One-time"}
                    >
                      {bill.recurring ? "🔄" : "🔄"}
                    </button>
                    <button className="edit-bill-btn" onClick={() => setEditingBill(bill)}>✏️</button>
                  </div>
                </div>

                {/* Inline pay form */}
                {isPaying && (
                  <div className="pay-form">
                    <div className="budget-input-wrap big">
                      <span className="dollar-sign big">$</span>
                      <input
                        type="number"
                        className="budget-input big"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <input
                      type="date"
                      className="settings-input"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                    />
                    <div className="add-bill-actions">
                      <button type="button" className="cancel-btn" onClick={cancelPay}>Cancel</button>
                      <button type="button" className="save-btn" onClick={() => savePay(bill)}>Save</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showAdd ? (
          <form onSubmit={submitBill} className="add-bill-form">
            <input className="settings-input" placeholder="Bill name (e.g. Water, Gas)" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            <input className="settings-input" placeholder="Auto-detect keyword (e.g. EBMUD)" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} />
            <label className="recurring-label">
              <input type="checkbox" checked={newRecurring} onChange={(e) => setNewRecurring(e.target.checked)} />
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

      {/* ── Edit modal ─────────────────────────────────────── */}
      {editingBill && (
        <EditBillModal
          bill={editingBill}
          onSave={saveBillEdit}
          onDelete={deleteBill}
          onClose={() => setEditingBill(null)}
        />
      )}
    </div>
  );
}
