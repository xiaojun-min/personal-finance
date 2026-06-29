import { useState, useRef } from "react";
import { extractTextFromPdf } from "../utils/pdfExtract";
import { parseStatement } from "../api/claude";

export default function Upload({ onComplete, onClose }) {
  const [step, setStep] = useState("idle"); // idle | extracting | analyzing | done | error
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
    setStep("extracting");
    try {
      const rawText = await extractTextFromPdf(file);
      if (!rawText.trim()) throw new Error("No text found in PDF. Is it a scanned image? Try a text-based PDF.");

      setStep("analyzing");
      const result = await parseStatement(rawText, apiKey);

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

        {step === "extracting" && (
          <div className="upload-progress">
            <div className="spinner" />
            <p>Reading PDF...</p>
          </div>
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
