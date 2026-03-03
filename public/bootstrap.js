// Bootstrap: classic script loaded by Chrome via manifest.
// Its only job is to import() the actual ESM module entry.
// When loaded via import(), content.js runs as an ES module,
// so import.meta.url and relative import() paths work correctly
// within the extension's chrome-extension:// origin.
(async () => {
  try {
    await import(chrome.runtime.getURL("/content.js"));
  } catch (err) {
    console.error("[Extension Bootstrap] Failed to load content module:", err);
  }
})();
