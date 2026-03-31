import React, { Suspense, lazy, useState, Component, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ShadowRootContext, useShadowStyles } from "../utils/shadow-style";
import css from "./panel.css?raw";

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
        <div className="error">
          <p className="errorMessage">Failed to load component</p>
          <pre className="errorDetail">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="retryBtn"
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
  useShadowStyles(css);

  const [tab, setTab] = useState<Tab>("main");
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="openBtn">
        Open Panel
      </button>
    );
  }

  return (
    <div className="panel">
      <div className="header">
        <span className="headerTitle">Extension Panel</span>
        <button onClick={() => setIsOpen(false)} className="closeBtn">
          ✕
        </button>
      </div>

      <div className="tabs">
        {(["main", "table", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab ${tab === t ? "tabActive" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="content">
        <ErrorBoundary>
          <Suspense fallback={<div className="loading">Loading...</div>}>
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
      <h3 className="dashboardTitle">Dashboard</h3>
      <p className="dashboardText">
        This panel was lazy-loaded. The Table and Settings tabs will load their
        own chunks on demand via React.lazy().
      </p>
    </div>
  );
}

const CONTAINER_ID = "ext-lazy-panel-root";
let root: Root | null = null;
let shadowRef: ShadowRoot | null = null;

export function mountPanel(): void {
  let container = document.getElementById(CONTAINER_ID);

  if (!container) {
    container = document.createElement("div");
    container.id = CONTAINER_ID;

    shadowRef = container.attachShadow({ mode: "open" });

    const mountPoint = document.createElement("div");
    shadowRef.appendChild(mountPoint);

    document.body.appendChild(container);
    root = createRoot(mountPoint);
  }

  root?.render(
    <ShadowRootContext.Provider value={shadowRef}>
      <Panel />
    </ShadowRootContext.Provider>,
  );
}

export function unmountPanel(): void {
  root?.unmount();
  root = null;
  shadowRef = null;
  document.getElementById(CONTAINER_ID)?.remove();
}
