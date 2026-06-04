const markdown = document.querySelector("#markdown");
const instruction = document.querySelector("#instruction");
const preview = document.querySelector("#preview");
const warnings = document.querySelector("#warnings");
const agentOutput = document.querySelector("#agentOutput");
const agentButton = document.querySelector("#agentButton");

let renderTimer;

async function render() {
  const response = await fetch("/api/parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ markdown: markdown.value }),
  });
  const data = await response.json();
  preview.innerHTML = data.html;
  warnings.innerHTML = (data.deck.warnings || []).map((warning) => `<p>${escapeHtml(warning)}</p>`).join("");
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 120);
}

async function askAgent() {
  agentButton.disabled = true;
  agentOutput.textContent = "Agent に問い合わせ中...";
  try {
    const response = await fetch("/api/agent/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: markdown.value, instruction: instruction.value, activeSlide: 0 }),
    });
    const data = await response.json();
    agentOutput.innerHTML = `<strong>${escapeHtml(data.source || "agent")}</strong><p>${escapeHtml(data.suggestion || "No suggestion")}</p>`;
  } catch (error) {
    agentOutput.textContent = `Agent error: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    agentButton.disabled = false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

markdown.addEventListener("input", scheduleRender);
agentButton.addEventListener("click", askAgent);
render();
