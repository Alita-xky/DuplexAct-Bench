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
  const caption = label ? `<span>${esc(label)}</span>` : "";
  return `<div class="ex-audio">${caption}<audio controls preload="metadata" src="${esc(src)}"></audio></div>`;
}

function contextKind(item) {
  if (!item.context) return "";
  if (item.condition === "Pre-session") return "Profile";
  if (item.condition === "In-session") return "Instruction";
  return "Context";
}

function modelCard(model, silence) {
  const ok = model.state === "good";
  const bits = [];
  if (!silence && model.content != null) bits.push(`Content ${model.content}`);
  if (model.timing != null) bits.push(model.timing ? "Timing met" : "Timing missed");
  if (silence) bits.push(ok ? "Stayed silent" : "Spoke");
  const transcript = model.transcript
    ? `<p class="ex-transcript">${esc(model.transcript)}</p>`
    : `<p class="ex-transcript muted">${ok && silence ? "No speech detected." : ""}</p>`;
  return `<article class="ex-model ${ok ? "good" : "bad"}">
    <div class="ex-model-head">
      <strong>${esc(model.name)}</strong>
      <span class="ex-tag">${ok ? "Behaviorally correct" : "Not behaviorally correct"}</span>
    </div>
    <p class="ex-meta">${esc(bits.join(" · "))}</p>
    ${transcript}
    ${audioBlock(model.audio, "System response")}
  </article>`;
}

function trialBlock(item, index, total) {
  const lang = LANG[item.language] || item.language || "";
  const title = total > 1 ? `Example ${index + 1} · ${lang}` : lang;
  const kind = contextKind(item);
  const context = kind
    ? `<div class="ex-block profile"><span class="ex-kicker">${esc(kind)}</span><p>${esc(item.context)}</p></div>`
    : "";
  const userText = item.user_transcript || "No user speech in this trial.";
  const interrupt = item.user_interrupt
    ? audioBlock(item.user_interrupt, "User interruption")
    : "";
  return `<section class="ex-trial">
    <h4 class="ex-trial-head">${esc(title)}</h4>
    ${context}
    <div class="ex-block user">
      <span class="ex-kicker">User</span>
      <p>${esc(userText)}</p>
      <div class="ex-user-row">
        ${audioBlock(item.user_audio, "")}
        ${interrupt}
      </div>
    </div>
    <p class="ex-kicker systems-kicker">Systems on this trial</p>
    <div class="ex-systems">
      ${item.models.map((model) => modelCard(model, item.silence)).join("")}
    </div>
  </section>`;
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
      card.innerHTML = `
        <button class="ex-head" type="button">
          <span>${esc(condition)}</span>
          <span class="cond-badge cond-${COND[condition] || "no_explicit"}">${trials.length} example${trials.length > 1 ? "s" : ""}</span>
          <i class="fas fa-chevron-down"></i>
        </button>
        <div class="ex-body">
          ${trials.map((item, index) => trialBlock(item, index, trials.length)).join("")}
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
