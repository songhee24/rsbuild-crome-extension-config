import React, { lazy, Suspense, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import styles from "./banner.module.css";

const HeavyReactElement = lazy(
  () =>
    import(
      /* webpackChunkName: "feature-heavy-react-element" */
      "./heavy-react-element"
    ),
);

function Banner() {
  const [visible, setVisible] = useState(true);
  const [renderHeavyReactElement, setRenderHeavyReactElement] = useState(false);

  if (!visible) return null;

  return (
    <div className={styles.banner}>
      <span className={styles.text}>
        CSS Modules banner — injected directly into the page DOM
      </span>

      {renderHeavyReactElement && (
        <Suspense fallback={<span>Loading...</span>}>
          <HeavyReactElement />
        </Suspense>
      )}
      <button onClick={() => setRenderHeavyReactElement(true)}>Render Heavy React Element</button>
      <button onClick={() => setVisible(false)} className={styles.closeBtn}>
        ✕
      </button>
    </div>
  );
}

const CONTAINER_ID = "ext-banner-root";
let root: Root | null = null;

export function mountBanner(): void {
  let container = document.getElementById(CONTAINER_ID);

  if (!container) {
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
    root = createRoot(container);
  }

  root?.render(<Banner />);
}

export function unmountBanner(): void {
  root?.unmount();
  root = null;
  document.getElementById(CONTAINER_ID)?.remove();
}
