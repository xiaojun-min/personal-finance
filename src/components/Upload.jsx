import { useState, useRef } from "react";
import { fileToBase64 } from "../utils/pdfExtract";
import { parseStatement } from "../api/claude";

const DEFAULT_CARDS = [
  { id: "chase-sapphire",  name: "Chase Sapphire Preferred" },
  { id: "chase-unlimited", name: "Chase Unlimited" },
  { id: "bofa",            name: "Bank of America" },
  { id: "discover",        name: "Discover" },
];

function loadCards() {
  try { return JSON.parse(localStorage.getItem("pf_cards") ?? "null") ?? DEFAULT_CARDS; }
  catch { return DEFAULT_CARDS; }
}

export default function Upload({ onComplete, onClose }) {
  const [step, setStep]   = useState("idle"); // idle | analyzing | done | error
  const [error, setError] = useState("");
  const [detected, setDetected] = useState(null); // { cardName, cardId } after analysis
  const cards             = loadCards();
  const fileRef           = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = localStorage.getItem("anthropic_api_key") || import.meta.env.ANTHROPIC_API_KEY || "";
    if (!apiKey) {
      setError("No API key set. Go to Settings first.");
      setStep("error");
      return;
    }

    setError("");
    setDetected(null);
    setStep("analyzing");
    try {
      const pdfBase64 = await fileToBase64(file);
      const result = await parseStatement(pdfBase64, apiKey, cards);

      if (!result.transactions?.length) throw new Error("No transactions found in the statement.");

      const transactions = result.transactions.map((t, i) => ({
        ...t,
        id: `${Date.now()}-${i}`,
        amount: parseFloat(t.amount) || 0,
      }));

      const matchedCard = cards.find((c) => c.id === result.cardId) || null;
      setDetected(matchedCard ? { cardName: matchedCard.name, cardId: matchedCard.id } : null);
      onComplete({ month: result.month, transactions, cardId: result.cardId || null });
      setStep("done");
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setStep("error");
    }
  }

  return (
    <div className="upload-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="upload-modal">
        <div className="upload-modal-header">
          <h2>Upload Bank Statement</h2>
          {onClose && <button className="close-btn" onClick={onClose}>✕</button>}
        </div>

        {(step === "idle" || step === "error") && (
          <>
            <button className="upload-trigger-btn" onClick={() => fileRef.current?.click()}>
              <span className="upload-trigger-icon">📄</span>
              <span>Choose PDF file</span>
            </button>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={handleFile} style={{ display: "none" }} />

            {step === "error" && <div className="upload-error">⚠️ {error}</div>}
            <p className="upload-hint">Card and month are detected automatically from your statement.</p>
          </>
        )}

        {step === "analyzing" && (
          <div className="upload-progress">
            <div className="spinner" />
            <p>Analyzing transactions with AI…</p>
            <p className="upload-hint">This may take 15–30 seconds for large statements.</p>
          </div>
        )}
      </div>
    </div>
  );
}
