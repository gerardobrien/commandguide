// Fails the build if the output is incomplete or has broken internal links.
import { access, readFile } from "node:fs/promises";

const errors = [];
for (const file of ["index.html", "404.html", "styles.css", "app.js", ".htaccess", "version.txt"]) {
  await access(`dist/${file}`).catch(() => errors.push(`Missing dist/${file}`));
}
for (const file of ["index.html", "404.html"]) {
  const html = await readFile(`dist/${file}`, "utf8");
  for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const target = url === "/" ? "index.html" : url.slice(1);
    await access(`dist/${target}`).catch(() => errors.push(`${file}: broken link ${url}`));
  }
}
const seen = new Set();
for (const { items } of JSON.parse(await readFile("src/commands.json", "utf8"))) {
  for (const { task, cmd } of items) {
    if (!task || !cmd) errors.push("A command is missing its task or cmd");
    if (seen.has(task)) errors.push(`Duplicate task: ${task}`);
    seen.add(task);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Checks passed for ${seen.size} commands`);
