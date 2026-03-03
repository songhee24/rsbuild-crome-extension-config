/**
 * Page Scraper — plain TypeScript, no React.
 * Loaded lazily via dynamic import.
 */

interface ScrapedItem {
  tag: string;
  text: string;
  href?: string;
}

export function scrapePageData(): ScrapedItem[] {
  const results: ScrapedItem[] = [];

  document.querySelectorAll("h1, h2, h3").forEach((el) => {
    results.push({
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.trim() ?? "",
    });
  });

  document.querySelectorAll("a[href]").forEach((el) => {
    const anchor = el as HTMLAnchorElement;
    results.push({
      tag: "a",
      text: anchor.textContent?.trim() ?? "",
      href: anchor.href,
    });
  });

  return results;
}

export function queryTexts(selector: string): string[] {
  return Array.from(document.querySelectorAll(selector))
    .map((el) => el.textContent?.trim() ?? "")
    .filter(Boolean);
}

export function waitForElement(
  selector: string,
  timeout = 10000,
): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver((_mutations, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}
