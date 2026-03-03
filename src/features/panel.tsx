import React, { Suspense, lazy, useState, Component, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

const HeavyTable = lazy(
  () =>
    import(
      /* webpackChunkName: "component-heavy-table" */
      "./components/HeavyTable"
    ),
);

const Settings = lazy(
  () =>
    import(
      /* webpackChunkName: "component-settings" */
      "./components/Settings"
    ),
);

// ErrorBoundary for graceful degradation on chunk load failures
interface EBProps { children: ReactNode; }
interface EBState { error: Error | null; }

class ErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: "#f44" }}>
          <p style={{ margin: 0 }}>Failed to load component</p>
          <pre style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 8,
              padding: "4px 12px",
              background: "#333",
              color: "#eee",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type Tab = "main" | "table" | "settings";

function Panel() {
  const [tab, setTab] = useState<Tab>("main");
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 99999,
          padding: "8px 16px",
          background: "#1a1a2e",
          color: "#eee",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        Open Panel
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: 400,
        maxHeight: 500,
        zIndex: 99999,
        background: "#1a1a2e",
        color: "#e0e0e0",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #2a2a4a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 600 }}>Extension Panel</span>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            fontSize: 18,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #2a2a4a" }}>
        {(["main", "table", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "8px 0",
              background: tab === t ? "#2a2a4a" : "transparent",
              color: tab === t ? "#fff" : "#888",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div style={{ textAlign: "center", padding: 20, color: "#666" }}>
                Loading...
              </div>
            }
          >
            {tab === "main" && <MainTab />}
            {tab === "table" && <HeavyTable />}
            {tab === "settings" && <Settings />}
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

function MainTab() {
  return (
    <div>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Dashboard</h3>
      <p style={{ margin: 0, color: "#999", lineHeight: 1.5 }}>
        This panel was lazy-loaded. The Table and Settings tabs will load their
        own chunks on demand via React.lazy().
      </p>
    </div>
  );
}

const CONTAINER_ID = "ext-lazy-panel-root";
let root: Root | null = null;

export function mountPanel(): void {
  let container = document.getElementById(CONTAINER_ID);

  if (!container) {
    container = document.createElement("div");
    container.id = CONTAINER_ID;

    const shadow = container.attachShadow({ mode: "open" });
    const mountPoint = document.createElement("div");
    shadow.appendChild(mountPoint);

    document.body.appendChild(container);
    root = createRoot(mountPoint);
  }

  root?.render(<Panel />);
}

export function unmountPanel(): void {
  root?.unmount();
  root = null;
  document.getElementById(CONTAINER_ID)?.remove();
}
