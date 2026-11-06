// Fails the build if guide data is invalid, output is incomplete or internal links are broken.
import { access, readFile, readdir } from "node:fs/promises";

const errors = [];
const PLATFORMS = new Set(["linux", "macos", "windows", "cisco"]);
const DISTROS = new Set(["debian", "redhat", "alpine"]);
const TONES = new Set(["amber", "coral", "sky", "mint", "violet"]);
const order = JSON.parse(await readFile("src/guide-order.json", "utf8"));
const files = (await readdir("src/guides")).map((f) => f.replace(/\.json$/, ""));
for (const f of files) if (!order.includes(f)) errors.push(`src/guides/${f}.json is not listed in guide-order.json`);

let total = 0;
for (const slug of order) {
  const guide = JSON.parse(await readFile(`src/guides/${slug}.json`, "utf8"));
  if (guide.slug !== slug) errors.push(`${slug}: slug doesn't match the file name`);
  if (!guide.title || !guide.description) errors.push(`${slug}: missing title or description`);
  if (!TONES.has(guide.tone)) errors.push(`${slug}: tone must be one of ${[...TONES].join(", ")}`);
  const seen = new Set();
  for (const { group, items } of guide.groups) {
    if (!group || !items?.length) errors.push(`${slug}: empty or unnamed group`);
    for (const { task, cmd, platforms, distros, warning } of items) {
      total += 1;
      if (!task || !cmd) errors.push(`${slug}/${group}: command missing task or cmd`);
      const key = `${task}|${(distros ?? []).join(",")}`;
      if (seen.has(key)) errors.push(`${slug}: duplicate task "${task}"`);
      seen.add(key);
      if (distros !== undefined) {
        if (!distros.length || distros.some((d) => !DISTROS.has(d))) errors.push(`${slug}: "${task}" has invalid distros`);
        if (platforms?.join() !== "linux") errors.push(`${slug}: "${task}" has distros, so its platforms must be ["linux"]`);
      }
      if (!platforms?.length || platforms.some((p) => !PLATFORMS.has(p))) errors.push(`${slug}: "${task}" has invalid platforms`);
      if (warning !== undefined && !warning.trim()) errors.push(`${slug}: "${task}" has an empty warning`);
    }
  }
}

const required = ["index.html", "404.html", ".htaccess", "version.txt", "sitemap.xml", "robots.txt", "favicon.svg", "fonts/bricolage-grotesque.woff2", "fonts/martian-mono.woff2", ...order.map((s) => `${s}/index.html`)];
for (const file of required) await access(`dist/${file}`).catch(() => errors.push(`Missing dist/${file}`));

for (const file of ["index.html", "404.html", ...order.map((s) => `${s}/index.html`)]) {
  const html = await readFile(`dist/${file}`, "utf8").catch(() => "");
  for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const target = url.endsWith("/") ? `${url.slice(1)}index.html` : url.slice(1);
    await access(`dist/${target}`).catch(() => errors.push(`${file}: broken link ${url}`));
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Checks passed for ${total} commands in ${order.length} guides`);
