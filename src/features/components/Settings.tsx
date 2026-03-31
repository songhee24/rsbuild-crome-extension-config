import React, { useState } from "react";
import styles from "./Settings.module.css";

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
  const [settings, setSettings] = useState<SettingsState>(DEFAULTS);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className={styles.container}>
      <ToggleRow
        label="Auto-scrape"
        description="Automatically scrape page data on load"
        checked={settings.autoScrape}
        onChange={(v) => update("autoScrape", v)}
      />

      {settings.autoScrape && (
        <div className={styles.intervalGroup}>
          <label className={styles.intervalLabel}>
            Interval: {settings.scrapeInterval}s
          </label>
          <input
            type="range"
            min={5}
            max={120}
            value={settings.scrapeInterval}
            onChange={(e) => update("scrapeInterval", Number(e.target.value))}
            className={styles.intervalRange}
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

      <button onClick={() => setSettings(DEFAULTS)} className={styles.resetBtn}>
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
    <div className={styles.toggleRow}>
      <div>
        <div className={styles.toggleLabel}>{label}</div>
        <div className={styles.toggleDesc}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`${styles.switch} ${checked ? styles.switchOn : ""}`}
      >
        <div
          className={`${styles.switchKnob} ${checked ? styles.switchKnobOn : ""}`}
        />
      </button>
    </div>
  );
}
