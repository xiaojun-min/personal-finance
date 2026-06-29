import { useState } from "react";
import { CATEGORIES, CATEGORY_NAMES } from "../constants";

const today = () => new Date().toISOString().slice(0, 10);

export default function AddTransaction({ onAdd, onClose }) {
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("debit");
  const [category, setCategory] = useState("Utilities & Bills");

  function handleSubmit(e) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!description.trim() || !amt || amt <= 0) return;
    onAdd({
      id: `manual-${Date.now()}`,
      date,
      description: description.trim(),
      amount: amt,
      type,
      category: type === "credit" ? "Income" : category,
    });
    onClose();
  }

  function handleTypeChange(newType) {
    setType(newType);
    if (newType === "credit") setCategory("Income");
    else if (category === "Income") setCategory("Utilities & Bills");
  }

  return (
    <div className="upload-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="upload-modal">
        <div className="upload-modal-header">
          <h2>Add Transaction</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="add-txn-form">
          <div className="type-toggle">
            <button type="button" className={`type-btn${type === "debit" ? " active" : ""}`} onClick={() => handleTypeChange("debit")}>
              Expense
            </button>
            <button type="button" className={`type-btn${type === "credit" ? " active" : ""}`} onClick={() => handleTypeChange("credit")}>
              Income
            </button>
          </div>

          <div className="add-txn-field">
            <label className="add-txn-label">Date</label>
            <input type="date" className="settings-input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="add-txn-field">
            <label className="add-txn-label">Description</label>
            <input
              type="text"
              className="settings-input"
              placeholder="e.g. Rent, Electric bill…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="add-txn-field">
            <label className="add-txn-label">Amount</label>
            <div className="budget-input-wrap big">
              <span className="dollar-sign big">$</span>
              <input
                type="number"
                className="budget-input big"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {type === "debit" && (
            <div className="add-txn-field">
              <label className="add-txn-label">Category</label>
              <select className="settings-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORY_NAMES.filter((c) => c !== "Income").map((c) => (
                  <option key={c} value={c}>{CATEGORIES[c].emoji} {c}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="save-btn" style={{ marginTop: 4 }}>
            Add Transaction
          </button>
        </form>
      </div>
    </div>
  );
}
