// Builds the static site into dist/. Uses Node's standard library only.
import { execSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const groups = JSON.parse(await readFile("src/commands.json", "utf8"));
const layout = await readFile("src/layout.html", "utf8");
const page = (title, body) => layout.replace("{{title}}", () => title).replace("{{body}}", () => body);

const sections = groups.map(({ group, items }) => `<section>
<h2>${esc(group)}</h2>
<ul>
${items.map(({ task, cmd }) => `<li data-task="${esc(task)}" data-cmd="${esc(cmd)}"><span>${esc(task)}</span><code>${esc(cmd)}</code><button type="button">Copy</button></li>`).join("\n")}
</ul>
</section>`).join("\n");

const index = page("Command Guide", `<div class="wrap">
<header>
<label for="q">What do you want to do?</label>
<input id="q" type="search" placeholder="open port, undo commit, disk space" autocomplete="off" spellcheck="false">
<p id="status" role="status"></p>
</header>
<main>
${sections}
</main>
<footer>Check a command before you run it. Replace the example names with your own. Commands are written for Linux, and some work differently or are missing on macOS.</footer>
</div>
<script src="/app.js"></script>`);

const notFound = page("Page not found | Command Guide", `<div class="wrap">
<header>
<h1>That page doesn't exist.</h1>
<p><a href="/">Go to the command list</a></p>
</header>
</div>`);

const version = process.env.GITHUB_SHA ?? execSync("git rev-parse HEAD 2>/dev/null || echo local", { shell: "/bin/sh" }).toString().trim();

await rm("dist", { recursive: true, force: true });
await mkdir("dist");
await writeFile("dist/index.html", index);
await writeFile("dist/404.html", notFound);
await writeFile("dist/version.txt", `${version}\n`);
for (const file of ["styles.css", "app.js", ".htaccess"]) await cp(`src/${file}`, `dist/${file}`);
console.log(`Built dist/ with ${groups.flatMap((g) => g.items).length} commands at ${version}`);
