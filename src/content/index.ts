/**
 * Content Script Module Entry
 *
 * Loaded as ESM module by bootstrap.js via import(chrome.runtime.getURL('/content.js')).
 * Since this runs as a module, import.meta.url = chrome-extension://<id>/content.js
 * and all relative import() paths resolve within the extension's origin.
 *
 * All heavy logic is loaded lazily via dynamic import().
 */

async function loadPanel(): Promise<void> {
  try {
    const { mountPanel } = await import(
      /* webpackChunkName: "feature-panel" */
      "../features/panel"
    );
    mountPanel();
    console.log("[ContentScript] Panel mounted");
  } catch (err) {
    console.error("[ContentScript] Failed to load panel:", err);
  }
}

async function loadScraper(): Promise<Record<string, string>[]> {
  try {
    const { scrapePageData } = await import(
      /* webpackChunkName: "feature-scraper" */
      "../features/scraper"
    );
    const data = scrapePageData();
    console.log("[ContentScript] Scraped data:", data.length, "items");
    return data;
  } catch (err) {
    console.error("[ContentScript] Failed to load scraper:", err);
    return [];
  }
}

async function loadBanner(): Promise<void> {
  try {
    const { mountBanner } = await import(
      /* webpackChunkName: "feature-banner" */
      "../features/banner"
    );
    mountBanner();
    console.log("[ContentScript] Banner mounted (CSS Modules, direct DOM)");
  } catch (err) {
    console.error("[ContentScript] Failed to load banner:", err);
  }
}

async function loadHeavyCalc(input: number[]): Promise<number> {
  try {
    const { processData } = await import(
      /* webpackChunkName: "util-heavy-calc" */
      "../utils/heavy-calc"
    );
    return processData(input);
  } catch (err) {
    console.error("[ContentScript] Failed to load heavy-calc:", err);
    return 0;
  }
}

function init(): void {
  console.log("[ContentScript] Module loaded via bootstrap");

  if (shouldAutoMount()) {
    loadPanel();
    loadBanner();
  }

  // Expose loaders to global scope for manual testing via DevTools console
  Object.assign(globalThis, {
    __extLoadPanel: loadPanel,
    __extLoadBanner: loadBanner,
    __extLoadScraper: loadScraper,
    __extLoadHeavyCalc: loadHeavyCalc,
  });
}

function shouldAutoMount(): boolean {
  return window.location.href.includes("example.com");
}

init();
