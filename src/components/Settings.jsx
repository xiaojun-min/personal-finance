import { useState, useRef } from "react";

const DATA_KEYS = [
  "pf_statements",
  "pf_budget",
  "pf_cards",
  "pf_bills",
  "pf_card_uploads",
  "pf_bill_manual",
];

function exportData() {
  const data = { exportedAt: new Date().toISOString(), version: 1 };
  for (const key of DATA_KEYS) {
    try { data[key] = JSON.parse(localStorage.getItem(key) ?? "null"); }
    catch { data[key] = null; }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file, onDone) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.version) throw new Error("Unrecognised file format.");
      for (const key of DATA_KEYS) {
        if (data[key] !== undefined && data[key] !== null) {
          localStorage.setItem(key, JSON.stringify(data[key]));
        }
      }
      onDone(null);
    } catch (err) {
      onDone(err.message || "Could not read file.");
    }
  };
  reader.readAsText(file);
}

export default function Settings() {
  const [key, setKey]         = useState(() => localStorage.getItem("anthropic_api_key") || "");
  const [saved, setSaved]     = useState(false);
  const [importMsg, setImportMsg] = useState(null); // { ok, text }
  const importRef             = useRef(null);

  function save() {
    localStorage.setItem("anthropic_api_key", key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    importData(file, (err) => {
      if (err) {
        setImportMsg({ ok: false, text: err });
      } else {
        setImportMsg({ ok: true, text: "Data imported! Reload the page to see your data." });
      }
    });
    e.target.value = "";
  }

  return (
    <div className="settings-page">
      <h2 className="section-title">Settings</h2>

      {/* API Key */}
      <div className="settings-card">
        <label className="settings-label">Anthropic API Key</label>
        <p className="settings-desc">
          Required to analyze your bank statements. Stored only in this browser.
        </p>
        <input
          type="password"
          className="settings-input"
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => { setKey(e.target.value); setSaved(false); }}
          autoComplete="new-password"
          spellCheck={false}
        />
        <button className="save-btn" onClick={save} disabled={!key.trim()}>
          {saved ? "✅ Saved!" : "Save Key"}
        </button>
        <p className="settings-hint">Get your key at console.anthropic.com → API Keys</p>
      </div>

      {/* Export / Import */}
      <div className="settings-card">
        <label className="settings-label">Backup & Restore</label>
        <p className="settings-desc">
          Export all your statements, transactions, bills, and checklist data to a JSON file.
          Import it on any device or after clearing browser data.
        </p>

        <button className="save-btn" onClick={exportData}>
          ↓ Export backup
        </button>

        <button className="import-btn" onClick={() => importRef.current?.click()}>
          ↑ Import backup
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImport}
          style={{ display: "none" }}
        />

        {importMsg && (
          <div className={importMsg.ok ? "import-success" : "upload-error"}>
            {importMsg.ok ? "✅ " : "⚠️ "}{importMsg.text}
          </div>
        )}
      </div>

      {/* About */}
      <div className="settings-card">
        <label className="settings-label">About</label>
        <p className="settings-desc">
          Your data is processed by Claude AI and stored only in your browser.
          Nothing is sent to any server except the Anthropic API for AI analysis.
        </p>
      </div>
    </div>
  );
}
