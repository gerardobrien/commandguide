// Builds the static site into dist/. Uses Node's standard library only.
// To add a guide: create src/guides/<slug>.json and add the slug to src/guide-order.json.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const SITE = "https://commandguide.com";
const PLATFORM_NAMES = { linux: "Linux", macos: "macOS", windows: "Windows", cisco: "Cisco IOS" };
const EXAMPLES = ["undo the last commit", "see what is using disk space", "list listening ports", "follow a container's logs", "create a new SSH key"];

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const shortName = (g) => g.title.replace(/ commands$/, "");
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const countOf = (g) => g.groups.reduce((n, { items }) => n + items.length, 0);

const order = await readJson("src/guide-order.json");
const guides = await Promise.all(order.map((slug) => readJson(`src/guides/${slug}.json`)));
const fingerprint = async (name) => {
  const [base, ext] = name.split(".");
  const hash = createHash("sha256").update(await readFile(`src/${name}`)).digest("hex").slice(0, 10);
  return `${base}.${hash}.${ext}`;
};
const cssFile = await fingerprint("styles.css");
const jsFile = await fingerprint("app.js");
const layout = (await readFile("src/layout.html", "utf8")).replace("/styles.css", () => `/${cssFile}`);

const page = ({ title, description, path, body }) => layout
  .replace("{{title}}", () => esc(title))
  .replace("{{description}}", () => esc(description))
  .replace("{{canonical}}", () => `${SITE}${path}`)
  .replace("{{body}}", () => body);

const nav = (current) => `<nav class="topnav" aria-label="Guides">
<a class="wordmark" href="/"${current === "home" ? ' aria-current="page"' : ""}>Command Guide</a>
<div class="topnav-links">
${guides.map((g) => `<a href="/${g.slug}/"${current === g.slug ? ' aria-current="page"' : ""}>${esc(shortName(g))}</a>`).join("\n")}
</div>
</nav>`;

const DISTRO_NAMES = { debian: "Debian, Ubuntu", redhat: "Red Hat, Fedora", alpine: "Alpine" };
const DISTRO_SEARCH = {
  debian: "debian ubuntu proxmox raspberry pi apt",
  redhat: "red hat rhel fedora rocky alma centos dnf yum",
  alpine: "alpine apk",
};
const ALL_DISTROS = Object.keys(DISTRO_SEARCH);

const labelOf = ({ platforms, distros }) => distros
  ? distros.map((d) => DISTRO_NAMES[d]).join(", ")
  : platforms.map((p) => PLATFORM_NAMES[p]).join(", ");
const searchOf = (item) => {
  const distros = item.distros ?? (item.platforms.includes("linux") ? ALL_DISTROS : []);
  return [labelOf(item), "linux", ...distros.map((d) => DISTRO_SEARCH[d])].join(" ");
};

// Consecutive commands with the same task are shown together, one line per distro.
const bundle = (items) => items.reduce((list, item) => {
  const last = list.at(-1);
  if (last && last.task === item.task) last.variants.push(item);
  else list.push({ task: item.task, variants: [item] });
  return list;
}, []);

const commandLine = (group, task, item, showLabel) => `<div class="variant" data-cmd="${esc(item.cmd)}" data-search="${esc(`${group} ${task} ${item.cmd} ${searchOf(item)}`)}">
${showLabel ? `<small class="variant-label">${esc(labelOf(item))}</small>` : ""}
<div class="cmd-line"><code>${esc(item.cmd)}</code><button type="button" aria-label="Copy command: ${esc(task)}${showLabel ? ` (${esc(labelOf(item))})` : ""}">Copy</button></div>
</div>`;

const row = (group) => ({ task, variants }) => {
  const single = variants.length === 1;
  const warnings = [...new Set(variants.map((v) => v.warning).filter(Boolean))];
  return `<li class="cmd${single ? "" : " has-variants"}" data-task="${esc(task)}">
<div class="cmd-head"><span class="task">${esc(task)}</span>${single ? `<small>${esc(labelOf(variants[0]))}</small>` : ""}</div>
${variants.map((v) => commandLine(group, task, v, !single)).join("\n")}
${warnings.map((w) => `<p class="warning">Warning: ${esc(w)}</p>`).join("\n")}
</li>`;
};

const sections = (guide, heading, idPrefix = "") => guide.groups.map(({ group, items }) => `<section id="${idPrefix}${slugify(group)}">
<h2>${esc(heading(group))}</h2>
<ul class="commands">
${bundle(items).map(row(group)).join("\n")}
</ul>
</section>`).join("\n");

const footer = `<footer class="site-footer"><div class="wrap">
<p>Check a command before you run it, and replace the example names with your own.</p>
<div class="credits">
<p>Brought to you by <a href="https://www.gerardobrien.com">Tech with Gerard</a>.</p>
<p>Made in Dublin. Supervised by Barry.</p>
</div>
</div></footer>`;
const script = `<script src="/${jsFile}"></script>`;

const home = page({
  title: "Command Guide",
  description: "Say what you want to do, and get the command to do it.",
  path: "/",
  body: `<header class="hero" id="hero">
<div class="wrap">
${nav("home")}
<div class="ask">
<h1><label for="q">I want to</label></h1>
<input id="q" type="search" data-examples="${esc(JSON.stringify(EXAMPLES))}" placeholder="${esc(EXAMPLES[0])}" autocomplete="off" spellcheck="false">
<div class="try" id="try"><span>Try</span>
${EXAMPLES.slice(1, 4).map((e) => `<button type="button" data-fill="${esc(e)}">${esc(e)}</button>`).join("\n")}
</div>
<p id="status" role="status"></p>
</div>
</div>
</header>
<main class="wrap sheet">
<div id="guides" class="guide-list">
${guides.map((g) => `<a class="guide-row tone-${g.tone}" href="/${g.slug}/">
<span class="guide-name">${esc(shortName(g))}</span>
<span class="guide-desc">${esc(g.description)}</span>
<span class="guide-count">${countOf(g)} commands</span>
</a>`).join("\n")}
</div>
<div id="results" hidden>
${guides.map((g) => sections(g, (group) => (group === shortName(g) ? group : `${shortName(g)}: ${group}`), `${g.slug}-`)).join("\n")}
</div>
</main>
${footer}
${script}`,
});

const guidePage = (g) => page({
  title: `${g.title} | Command Guide`,
  description: g.description,
  path: `/${g.slug}/`,
  body: `<header class="hero hero-guide tone-${g.tone}">
<div class="wrap">
${nav(g.slug)}
<div class="ask">
<h1><label for="q">${esc(g.title)}</label></h1>
<input id="q" type="search" placeholder="Search ${esc(g.title)}" autocomplete="off" spellcheck="false">
<p id="status" role="status"></p>
</div>
</div>
</header>
<div class="wrap sheet guide-layout">
<nav class="toc" aria-label="Sections">
${g.groups.map(({ group, items }) => `<a href="#${slugify(group)}" data-section="${slugify(group)}"><span>${esc(group)}</span><span>${items.length}</span></a>`).join("\n")}
</nav>
<main>
${g.note ? `<p class="guide-note">${esc(g.note)}</p>` : ""}
${sections(g, (group) => group)}
</main>
</div>
${footer}
${script}`,
});

const notFound = page({
  title: "Page not found | Command Guide",
  description: "This page doesn't exist.",
  path: "/404.html",
  body: `<header class="hero hero-guide">
<div class="wrap">
${nav("")}
<div class="ask">
<h1>That page doesn't exist.</h1>
<p class="missing"><a href="/">Search all commands</a></p>
</div>
</div>
</header>`,
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["/", ...guides.map((g) => `/${g.slug}/`)].map((p) => `<url><loc>${SITE}${p}</loc></url>`).join("\n")}
</urlset>
`;

const version = process.env.GITHUB_SHA ?? execSync("git rev-parse HEAD 2>/dev/null || echo local", { shell: "/bin/sh" }).toString().trim();

await rm("dist", { recursive: true, force: true });
await mkdir("dist/fonts", { recursive: true });
await writeFile("dist/index.html", home);
await writeFile("dist/404.html", notFound);
await writeFile("dist/version.txt", `${version}\n`);
await writeFile("dist/sitemap.xml", sitemap);
await writeFile("dist/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
for (const g of guides) {
  await mkdir(`dist/${g.slug}`);
  await writeFile(`dist/${g.slug}/index.html`, guidePage(g));
}
await cp("src/styles.css", `dist/${cssFile}`);
await cp("src/app.js", `dist/${jsFile}`);
for (const file of [".htaccess", "favicon.svg"]) await cp(`src/${file}`, `dist/${file}`);
const fonts = "node_modules/@fontsource-variable";
await cp(`${fonts}/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2`, "dist/fonts/bricolage-grotesque.woff2");
await cp(`${fonts}/martian-mono/files/martian-mono-latin-wght-normal.woff2`, "dist/fonts/martian-mono.woff2");
console.log(`Built ${guides.length} guides with ${guides.reduce((n, g) => n + countOf(g), 0)} commands at ${version}`);
