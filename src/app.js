const input = document.getElementById("q");
const status = document.getElementById("status");
const rows = [...document.querySelectorAll("li")];
const sections = [...document.querySelectorAll("section")];

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
  const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const row of rows) {
    const task = row.querySelector("span");
    const cmd = row.querySelector("code");
    const text = `${row.dataset.task} ${row.dataset.cmd}`.toLowerCase();
    const match = terms.every((term) => text.includes(term));
    row.hidden = !match;
    if (match) {
      shown += 1;
      paint(task, row.dataset.task, terms);
      paint(cmd, row.dataset.cmd, terms);
    }
  }
  for (const section of sections) {
    section.hidden = !section.querySelector("li:not([hidden])");
  }
  status.textContent = !terms.length
    ? `${rows.length} commands`
    : shown
      ? `${shown} of ${rows.length} commands`
      : "No commands match. Try one word, like “port” or “branch”.";
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const cmd = button.closest("li").dataset.cmd;
  try {
    await navigator.clipboard.writeText(cmd);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Failed";
  }
  setTimeout(() => { button.textContent = "Copy"; }, 1500);
});

input.addEventListener("input", filter);
filter();
