/**
 * Post-build: scans dist/chunks/ and updates web_accessible_resources
 * in dist/manifest.json with real chunk filenames.
 *
 * Usage: node scripts/generate-manifest.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");
const MANIFEST_PATH = path.join(DIST, "manifest.json");

function collectFiles(dir, prefix = "") {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(path.join(dir, entry.name), rel));
    } else if (/\.(js|css|wasm)$/.test(entry.name)) {
      files.push(rel);
    }
  }
  return files;
}

function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error("dist/manifest.json not found. Run `npm run build` first.");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  const chunkFiles = collectFiles(path.join(DIST, "chunks"), "chunks");

  console.log(`Found ${chunkFiles.length} chunk files:`);
  chunkFiles.forEach((f) => console.log(`  ${f}`));

  // content.js must also be accessible — bootstrap.js loads it via import()
  const resources = ["content.js", ...chunkFiles];

  const warEntry = {
    matches: ["<all_urls>"],
    resources,
    use_dynamic_url: false,
  };

  if (!manifest.web_accessible_resources) {
    manifest.web_accessible_resources = [warEntry];
  } else {
    const idx = manifest.web_accessible_resources.findIndex((r) =>
      r.resources?.some((res) => res.startsWith("chunks/")),
    );
    if (idx >= 0) {
      manifest.web_accessible_resources[idx] = warEntry;
    } else {
      manifest.web_accessible_resources.push(warEntry);
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log("dist/manifest.json updated with chunk resources.");
}

main();
