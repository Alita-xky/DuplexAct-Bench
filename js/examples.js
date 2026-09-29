const COND = {
  "Pre-session": "pre_session",
  "In-session": "in_session",
  "No-explicit": "no_explicit",
};

const COND_ORDER = ["Pre-session", "In-session", "No-explicit"];
const LANG = { en: "English", zh: "Chinese" };
const SKIP = new Set(["ai-lexical", "ai-noise"]);

function esc(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function audioBlock(src, label) {
  if (!src) return "";
  return `<div class="ex-audio"><span>${esc(label)}</span><audio controls preload="none" src="${esc(src)}"></audio></div>`;
}

function modelRow(model, silence) {
  const ok = model.state === "good";
  const bits = [];
  if (!silence && model.content != null) bits.push(`Content ${model.content}`);
  if (model.timing != null) bits.push(model.timing ? "Timing met" : "Timing missed");
  if (silence) bits.push(ok ? "Stayed silent" : "Spoke");
  const transcript = model.transcript
    ? `<p class="ex-transcript">${esc(model.transcript)}</p>`
    : "";
  return `<div class="ex-model ${ok ? "good" : "bad"}">
    <div class="ex-model-head">
      <strong>${esc(model.name)}</strong>
      <span class="ex-tag">${ok ? "Behaviorally correct" : "Not behaviorally correct"}</span>
      <span class="ex-meta">${esc(bits.join(" · "))}</span>
    </div>
    ${transcript}
    ${audioBlock(model.audio, "User + system")}
  </div>`;
}

function trialBlock(item, showLang) {
  const userText = item.user_transcript || "No user speech in this trial.";
  const context = item.context ? `<p class="ex-context">${esc(item.context)}</p>` : "";
  const interrupt = item.user_interrupt
    ? audioBlock(item.user_interrupt, "User interruption")
    : "";
  const lang = showLang
    ? `<p class="ex-lang">${esc(LANG[item.language] || item.language)}</p>`
    : "";
  return `<div class="ex-trial">
    ${lang}
    ${context}
    <p class="ex-user-text">${esc(userText)}</p>
    <div class="ex-user-row">
      ${audioBlock(item.user_audio, "User input")}
      ${interrupt}
    </div>
    ${item.models.map((model) => modelRow(model, item.silence)).join("")}
  </div>`;
}

function renderExamples(items) {
  const root = document.getElementById("examples-root");
  if (!root) return;
  const grouped = new Map();
  items.forEach((item) => {
    if (SKIP.has(item.id)) return;
    if (!grouped.has(item.behavior)) grouped.set(item.behavior, new Map());
    const byCond = grouped.get(item.behavior);
    if (!byCond.has(item.condition)) byCond.set(item.condition, []);
    byCond.get(item.condition).push(item);
  });

  grouped.forEach((byCond, behavior) => {
    const heading = document.createElement("h3");
    heading.className = "ex-behavior";
    heading.textContent = behavior;
    root.appendChild(heading);

    COND_ORDER.forEach((condition) => {
      const trials = byCond.get(condition);
      if (!trials || !trials.length) return;
      const card = document.createElement("div");
      card.className = "ex-card";
      const showLang = trials.length > 1;
      card.innerHTML = `
        <button class="ex-head" type="button">
          <span>${esc(condition)}</span>
          <span class="cond-badge cond-${COND[condition] || "no_explicit"}">${trials.length} example${trials.length > 1 ? "s" : ""}</span>
          <i class="fas fa-chevron-down"></i>
        </button>
        <div class="ex-body">
          ${trials.map((item) => trialBlock(item, showLang)).join("")}
        </div>`;
      card.querySelector(".ex-head").addEventListener("click", () => {
        card.classList.toggle("open");
      });
      root.appendChild(card);
    });
  });
}

fetch("js/examples.json")
  .then((res) => res.json())
  .then(renderExamples);
