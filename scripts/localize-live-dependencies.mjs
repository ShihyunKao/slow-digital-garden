import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const folders = ["open", "trail", "both-hands"];
const htmlFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (entry.name === "index.html") htmlFiles.push(absolute);
  }
}

for (const folder of folders) await walk(path.join(root, folder));

let changed = 0;
for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");
  if (!html.includes("ml5@1.0.1")) continue;

  const shellMatch = html.match(/src="([^\"]*assets\/live-shell\.js)"/);
  if (!shellMatch) throw new Error(`Cannot resolve project root from ${path.relative(root, file)}`);
  const prefix = shellMatch[1].slice(0, -"assets/live-shell.js".length);
  html = html.replace(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/p5@1\.11\.3\/lib\/p5\.min\.js"><\/script>/,
    `<script src="${prefix}assets/vendor/p5.min.js"></script>`
  );
  html = html.replace(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/ml5@1\.0\.1\/dist\/ml5\.min\.js"><\/script>/,
    `<script src="${prefix}assets/vendor/ml5.min.js"></script>\n    <script src="${prefix}assets/offline-runtime.js"></script>`
  );
  await writeFile(file, html);
  changed += 1;
}

console.log(`Localized p5, ml5 and HandPose configuration in ${changed} live pages.`);
