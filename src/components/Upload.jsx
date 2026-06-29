import { useState, useRef } from "react";
import { fileToBase64 } from "../utils/pdfExtract";
import { parseStatement } from "../api/claude";

export default function Upload({ onComplete, onClose }) {
  const [step, setStep] = useState("idle"); // idle | analyzing | done | error
  const [error, setError] = useState("");
  const fileRef = useRef(null);

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
    setStep("analyzing");
    try {
      const pdfBase64 = await fileToBase64(file);
      const result = await parseStatement(pdfBase64, apiKey);

      if (!result.transactions?.length) throw new Error("No transactions found in the statement.");

      // Assign unique IDs to transactions
      const transactions = result.transactions.map((t, i) => ({
        ...t,
        id: `${Date.now()}-${i}`,
        amount: parseFloat(t.amount) || 0,
      }));

      onComplete({ month: result.month, transactions });
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
          {onClose && (
            <button className="close-btn" onClick={onClose}>✕</button>
          )}
        </div>

        {(step === "idle" || step === "error") && (
          <>
            <p className="upload-desc">
              Upload your bank statement PDF and Claude AI will automatically extract and categorize all transactions.
            </p>
            <button className="upload-trigger-btn" onClick={() => fileRef.current?.click()}>
              <span className="upload-trigger-icon">📄</span>
              <span>Choose PDF file</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFile}
              style={{ display: "none" }}
            />
            {step === "error" && (
              <div className="upload-error">⚠️ {error}</div>
            )}
            <p className="upload-hint">Your data stays in your browser — nothing is stored on a server.</p>
          </>
        )}

        {step === "analyzing" && (
          <div className="upload-progress">
            <div className="spinner" />
            <p>Analyzing transactions with AI...</p>
            <p className="upload-hint">This may take 15–30 seconds for large statements.</p>
          </div>
        )}
      </div>
    </div>
  );
}
