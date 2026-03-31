import React, { useState } from "react";
import { useShadowStyles } from "../../utils/shadow-style";
import css from "./Settings.css?raw";

interface SettingsState {
  autoScrape: boolean;
  scrapeInterval: number;
  darkMode: boolean;
  notifications: boolean;
}

const DEFAULTS: SettingsState = {
  autoScrape: false,
  scrapeInterval: 30,
  darkMode: true,
  notifications: true,
};

export default function Settings() {
  useShadowStyles(css);

  const [settings, setSettings] = useState<SettingsState>(DEFAULTS);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container">
      <ToggleRow
        label="Auto-scrape"
        description="Automatically scrape page data on load"
        checked={settings.autoScrape}
        onChange={(v) => update("autoScrape", v)}
      />

      {settings.autoScrape && (
        <div className="intervalGroup">
          <label className="intervalLabel">
            Interval: {settings.scrapeInterval}s
          </label>
          <input
            type="range"
            min={5}
            max={120}
            value={settings.scrapeInterval}
            onChange={(e) => update("scrapeInterval", Number(e.target.value))}
            className="intervalRange"
          />
        </div>
      )}

      <ToggleRow
        label="Dark mode"
        description="Use dark theme for the panel"
        checked={settings.darkMode}
        onChange={(v) => update("darkMode", v)}
      />

      <ToggleRow
        label="Notifications"
        description="Show desktop notifications for events"
        checked={settings.notifications}
        onChange={(v) => update("notifications", v)}
      />

      <button onClick={() => setSettings(DEFAULTS)} className="resetBtn">
        Reset to defaults
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="toggleRow">
      <div>
        <div className="toggleLabel">{label}</div>
        <div className="toggleDesc">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`switch ${checked ? "switchOn" : ""}`}
      >
        <div className={`switchKnob ${checked ? "switchKnobOn" : ""}`} />
      </button>
    </div>
  );
}
