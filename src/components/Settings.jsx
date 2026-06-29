import { useState } from "react";

export default function Settings() {
  const [key, setKey] = useState(() => localStorage.getItem("anthropic_api_key") || "");
  const [saved, setSaved] = useState(false);

  function save() {
    localStorage.setItem("anthropic_api_key", key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="settings-page">
      <h2 className="section-title">Settings</h2>

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

      <div className="settings-card">
        <label className="settings-label">About</label>
        <p className="settings-desc">
          Your bank statement data is processed by Claude AI and stored only in your browser&apos;s localStorage.
          Nothing is sent to any server except the Anthropic API for AI analysis.
        </p>
      </div>
    </div>
  );
}
