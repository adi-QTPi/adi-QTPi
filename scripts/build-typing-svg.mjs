import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "typing.txt");
const readmePath = join(root, "README.md");

const START = "<!-- typing:start -->";
const END = "<!-- typing:end -->";
const ENDPOINT = "https://readme-typing-svg.demolab.com";

const defaults = {
  font: "Fira Code",
  size: 22,
  color: "268BD2",
  duration: 4000,
  pause: 1000,
  width: 480,
  vCenter: "true",
};

const parse = (text) => {
  const settings = { ...defaults };
  const lines = [];
  let inLines = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const pair = /^([A-Za-z][A-Za-z0-9]*)\s*:\s*(.+)$/.exec(line);
    if (!inLines && pair) {
      settings[pair[1]] = pair[2].trim();
      continue;
    }

    inLines = true;
    lines.push(line);
  }

  return { settings, lines };
};

const encode = (value) =>
  encodeURIComponent(String(value))
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

const buildUrl = ({ settings, lines }) => {
  const params = [
    "font",
    "size",
    "color",
    "duration",
    "pause",
    "vCenter",
    "width",
  ]
    .filter((key) => settings[key] !== undefined)
    .map((key) => `${key}=${encode(settings[key])}`);

  params.push(`lines=${lines.map(encode).join(";")}`);

  return `${ENDPOINT}?${params.join("&")}`;
};

const { settings, lines } = parse(readFileSync(sourcePath, "utf8"));

if (lines.length === 0) {
  console.error(`No lines found in typing.txt, nothing to generate.`);
  process.exit(1);
}

const url = buildUrl({ settings, lines });
const readme = readFileSync(readmePath, "utf8");

const startIndex = readme.indexOf(START);
const endIndex = readme.indexOf(END);

if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
  console.error(`README.md is missing the ${START} / ${END} markers.`);
  process.exit(1);
}

const block = `${START}<img src="${url}" alt="Typing SVG" align="middle" />${END}`;
const updated = readme.slice(0, startIndex) + block + readme.slice(endIndex + END.length);

if (updated === readme) {
  console.log(`README.md already up to date (${lines.length} lines).`);
  process.exit(0);
}

writeFileSync(readmePath, updated);
console.log(`README.md updated with ${lines.length} lines (${settings.font}, size ${settings.size}).`);
