import React, { useState } from "react";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ToggleRow
        label="Auto-scrape"
        description="Automatically scrape page data on load"
        checked={settings.autoScrape}
        onChange={(v) => update("autoScrape", v)}
      />

      {settings.autoScrape && (
        <div style={{ paddingLeft: 8 }}>
          <label style={{ color: "#999", fontSize: 12 }}>
            Interval: {settings.scrapeInterval}s
          </label>
          <input
            type="range"
            min={5}
            max={120}
            value={settings.scrapeInterval}
            onChange={(e) => update("scrapeInterval", Number(e.target.value))}
            style={{ width: "100%", marginTop: 4 }}
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

      <button
        onClick={() => setSettings(DEFAULTS)}
        style={{
          marginTop: 8,
          padding: "6px 16px",
          background: "#333",
          color: "#eee",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 13,
          alignSelf: "flex-start",
        }}
      >
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
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{label}</div>
        <div style={{ color: "#777", fontSize: 11, marginTop: 2 }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          border: "none",
          background: checked ? "#4caf50" : "#444",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );
}
