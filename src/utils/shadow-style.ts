declare global {
  interface Window {
    __extShadowRoots?: ShadowRoot[];
  }
}

/**
 * Register a shadow root so that all extension CSS (past and future)
 * is automatically injected into it.
 *
 * Call this right after `attachShadow()`, before rendering any content.
 */
export function registerShadowRoot(shadowRoot: ShadowRoot): void {
  window.__extShadowRoots = window.__extShadowRoots || [];
  window.__extShadowRoots.push(shadowRoot);

  document.head
    .querySelectorAll<HTMLElement>("style[data-ext]")
    .forEach((style) => {
      shadowRoot.appendChild(style.cloneNode(true));
    });
}

export function unregisterShadowRoot(shadowRoot: ShadowRoot): void {
  const roots = window.__extShadowRoots;
  if (!roots) return;
  const idx = roots.indexOf(shadowRoot);
  if (idx >= 0) roots.splice(idx, 1);
}
