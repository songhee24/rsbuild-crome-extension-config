import { createContext, useContext, useEffect, useRef } from "react";

export const ShadowRootContext = createContext<ShadowRoot | null>(null);

const sheetCache = new Map<string, CSSStyleSheet>();

/**
 * Adopt a CSS text into the nearest shadow root via `adoptedStyleSheets`.
 *
 * Usage:
 *   import css from './MyComponent.css?raw';
 *   useShadowStyles(css);
 *
 * The CSSStyleSheet is created once per unique cssText string and reused
 * across all components that import the same CSS file.
 */
export function useShadowStyles(cssText: string): void {
  const shadowRoot = useContext(ShadowRootContext);
  const adopted = useRef(false);

  useEffect(() => {
    if (!shadowRoot || adopted.current) return;
    adopted.current = true;

    let sheet = sheetCache.get(cssText);
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      sheetCache.set(cssText, sheet);
    }

    if (!shadowRoot.adoptedStyleSheets.includes(sheet)) {
      shadowRoot.adoptedStyleSheets = [
        ...shadowRoot.adoptedStyleSheets,
        sheet,
      ];
    }
  }, [shadowRoot, cssText]);
}
