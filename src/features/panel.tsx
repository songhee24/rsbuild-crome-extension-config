import React, { Suspense, lazy, useState, Component, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { registerShadowRoot } from "../utils/shadow-style";
import styles from "./panel.module.css";

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
        <div className={styles.error}>
          <p className={styles.errorMessage}>Failed to load component</p>
          <pre className={styles.errorDetail}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className={styles.retryBtn}
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
      <button onClick={() => setIsOpen(true)} className={styles.openBtn}>
        Open Panel
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Extension Panel</span>
        <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>
          ✕
        </button>
      </div>

      <div className={styles.tabs}>
        {(["main", "table", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        <ErrorBoundary>
          <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
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
      <h3 className={styles.dashboardTitle}>Dashboard</h3>
      <p className={styles.dashboardText}>
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
    registerShadowRoot(shadow);

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
