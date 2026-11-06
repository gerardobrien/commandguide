// Builds the static site into dist/. Uses Node's standard library only.
// To add a guide: create src/guides/<slug>.json and add the slug to src/guide-order.json.
import { execSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const SITE = "https://commandguide.com";
const PLATFORM_NAMES = { linux: "Linux", macos: "macOS", windows: "Windows", cisco: "Cisco IOS" };

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const order = await readJson("src/guide-order.json");
const guides = await Promise.all(order.map((slug) => readJson(`src/guides/${slug}.json`)));
const layout = await readFile("src/layout.html", "utf8");

const page = ({ title, description, path, body }) => layout
  .replace("{{title}}", () => esc(title))
  .replace("{{description}}", () => esc(description))
  .replace("{{canonical}}", () => `${SITE}${path}`)
  .replace("{{body}}", () => body);

const nav = (current) => `<nav aria-label="Guides">
<a href="/"${current === "home" ? ' aria-current="page"' : ""}>Command Guide</a>
${guides.map((g) => `<a href="/${g.slug}/"${current === g.slug ? ' aria-current="page"' : ""}>${esc(g.title.replace(/ commands$/, ""))}</a>`).join("\n")}
</nav>`;

const row = ({ task, cmd, platforms, warning }) => {
  const names = platforms.map((p) => PLATFORM_NAMES[p]).join(", ");
  return `<li data-task="${esc(task)}" data-cmd="${esc(cmd)}" data-platforms="${esc(names)}">
<div><span class="task">${esc(task)}</span><small>${esc(names)}</small>${warning ? `<strong class="warning">Warning: ${esc(warning)}</strong>` : ""}</div>
<code>${esc(cmd)}</code><button type="button">Copy</button></li>`;
};

const sections = (guide, heading) => guide.groups.map(({ group, items }) => `<section>
<h2>${esc(heading(group))}</h2>
<ul class="commands">
${items.map(row).join("\n")}
</ul>
</section>`).join("\n");

const search = (label, placeholder, tag = "label") => `<${tag === "h1" ? "h1" : "div"} class="ask"><label for="q">${esc(label)}</label></${tag === "h1" ? "h1" : "div"}>
<input id="q" type="search" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false">
<p id="status" role="status"></p>`;

const footer = "<footer>Check a command before you run it. Replace the example names with your own.</footer>";
const script = '<script src="/app.js"></script>';

const home = page({
  title: "Command Guide",
  description: "Find the command for what you want to do, then copy it.",
  path: "/",
  body: `<div class="wrap">
${nav("home")}
<header>
${search("What do you want to do?", "open port, undo commit, disk space", "h1")}
</header>
<main>
<div id="guides" class="guide-list">
${guides.map((g) => `<a href="/${g.slug}/"><span>${esc(g.title)}</span><small>${esc(g.description)}</small></a>`).join("\n")}
</div>
<div id="results" hidden>
${guides.map((g) => sections(g, (group) => `${g.title.replace(/ commands$/, "")}: ${group}`)).join("\n")}
</div>
</main>
${footer}
</div>
${script}`,
});

const guidePage = (g) => page({
  title: `${g.title} | Command Guide`,
  description: g.description,
  path: `/${g.slug}/`,
  body: `<div class="wrap">
${nav(g.slug)}
<header>
${search(g.title, `Search ${g.title}`, "h1")}
</header>
<main>
${sections(g, (group) => group)}
</main>
${footer}
</div>
${script}`,
});

const notFound = page({
  title: "Page not found | Command Guide",
  description: "This page doesn't exist.",
  path: "/404.html",
  body: `<div class="wrap">
${nav("")}
<header>
<h1 class="ask">That page doesn't exist.</h1>
<p><a href="/">Go to the command list</a></p>
</header>
</div>`,
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["/", ...guides.map((g) => `/${g.slug}/`)].map((p) => `<url><loc>${SITE}${p}</loc></url>`).join("\n")}
</urlset>
`;

const version = process.env.GITHUB_SHA ?? execSync("git rev-parse HEAD 2>/dev/null || echo local", { shell: "/bin/sh" }).toString().trim();

await rm("dist", { recursive: true, force: true });
await mkdir("dist");
await writeFile("dist/index.html", home);
await writeFile("dist/404.html", notFound);
await writeFile("dist/version.txt", `${version}\n`);
await writeFile("dist/sitemap.xml", sitemap);
await writeFile("dist/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
for (const g of guides) {
  await mkdir(`dist/${g.slug}`);
  await writeFile(`dist/${g.slug}/index.html`, guidePage(g));
}
for (const file of ["styles.css", "app.js", ".htaccess"]) await cp(`src/${file}`, `dist/${file}`);
const total = guides.flatMap((g) => g.groups).flatMap((g) => g.items).length;
console.log(`Built ${guides.length} guides with ${total} commands at ${version}`);
