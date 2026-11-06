const input = document.getElementById("q");
const status = document.getElementById("status");
const hero = document.querySelector(".hero");
const guideList = document.getElementById("guides");
const results = document.getElementById("results");
const tryRow = document.getElementById("try");
const rows = [...document.querySelectorAll("li.cmd")];
const variants = [...document.querySelectorAll(".variant")];
const sections = [...document.querySelectorAll("section")];
const STOP_WORDS = new Set(["a", "an", "the", "my", "to", "i", "want", "how", "do", "of", "in", "on", "for", "is", "learn", "know", "understand", "help", "me", "about", "please", "need", "would", "like", "can", "some", "show", "commands", "command", "with", "using", "from", "and"]);

function paint(el, source, terms) {
  el.textContent = "";
  const lower = source.toLowerCase();
  const hits = [];
  for (const term of terms) {
    for (let i = lower.indexOf(term); i !== -1; i = lower.indexOf(term, i + term.length)) {
      hits.push([i, i + term.length]);
    }
  }
  hits.sort((a, b) => a[0] - b[0]);
  let at = 0;
  for (const [start, end] of hits) {
    if (start < at) continue;
    el.append(source.slice(at, start));
    const mark = document.createElement("mark");
    mark.textContent = source.slice(start, end);
    el.append(mark);
    at = end;
  }
  el.append(source.slice(at));
}

function filter() {
  const typed = input.value.trim();
  const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
  const meaningful = words.filter((word) => !STOP_WORDS.has(word));
  const terms = meaningful.length ? meaningful : words;
  const all = (variant) => terms.every((term) => variant.dataset.search.toLowerCase().includes(term));
  const any = (variant) => terms.some((term) => variant.dataset.search.toLowerCase().includes(term));
  // Prefer commands matching every word. If there are none, show any that match a word.
  const exact = variants.some(all);
  const matches = exact ? all : any;
  let shown = 0;
  for (const row of rows) {
    let rowShown = false;
    for (const variant of row.querySelectorAll(".variant")) {
      const match = matches(variant);
      variant.hidden = !match;
      if (match) {
        shown += 1;
        rowShown = true;
        paint(variant.querySelector("code"), variant.dataset.cmd, terms);
      }
    }
    row.hidden = !rowShown;
    if (rowShown) paint(row.querySelector(".task"), row.dataset.task, terms);
  }
  for (const section of sections) {
    const visible = Boolean(section.querySelector("li.cmd:not([hidden])"));
    section.hidden = !visible;
    const link = document.querySelector(`.toc [data-section="${section.id}"]`);
    if (link) link.hidden = !visible;
  }
  const active = terms.length > 0;
  hero.classList.toggle("is-searching", active);
  if (guideList) {
    guideList.hidden = active;
    results.hidden = !active;
    tryRow.hidden = active;
  }
  if (!active) status.textContent = guideList ? "" : `${variants.length} commands`;
  else if (shown && exact) status.textContent = `${shown} of ${variants.length} commands`;
  else if (shown) status.textContent = `No exact match. Showing ${shown} commands that match some of your words.`;
  else status.textContent = "No commands match. Try one word, like “port” or “branch”.";
}

document.addEventListener("click", async (event) => {
  const fill = event.target.closest("[data-fill]");
  if (fill) {
    input.value = fill.dataset.fill;
    filter();
    input.focus();
    return;
  }
  const button = event.target.closest(".cmd button");
  if (!button) return;
  const cmd = button.closest(".variant").dataset.cmd;
  try {
    await navigator.clipboard.writeText(cmd);
    button.textContent = "Copied";
    button.classList.add("is-copied");
  } catch {
    button.textContent = "Failed";
  }
  setTimeout(() => {
    button.textContent = "Copy";
    button.classList.remove("is-copied");
  }, 1500);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== input) {
    event.preventDefault();
    input.focus();
  } else if (event.key === "Escape" && document.activeElement === input) {
    input.value = "";
    filter();
  }
});

input.addEventListener("input", filter);
filter();

// The home page types out example tasks in the empty search box.
const examples = input.dataset.examples ? JSON.parse(input.dataset.examples) : [];
if (examples.length && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let example = 0;
  let length = examples[0].length;
  let deleting = true;
  let pause = 14;
  setInterval(() => {
    if (document.hidden || input.value || document.activeElement === input) return;
    if (pause > 0) { pause -= 1; return; }
    length += deleting ? -1 : 1;
    if (length <= 0) {
      deleting = false;
      example = (example + 1) % examples.length;
    } else if (length >= examples[example].length) {
      deleting = true;
      pause = 22;
    }
    input.placeholder = examples[example].slice(0, Math.max(length, 0));
  }, 70);
}
