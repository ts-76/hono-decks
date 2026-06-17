import { createElement, render, useEffect, useState } from "hono/jsx/dom";

type EditorTab = "chat" | "mdx";

const tabs: Array<{ key: EditorTab; label: string; panelId: string }> = [
  { key: "chat", label: "Chat", panelId: "agentPanel" },
  { key: "mdx", label: "MDX", panelId: "mdxPanel" },
];

function EditorTabs() {
  const [activeTab, setActiveTab] = useState<EditorTab>("chat");

  useEffect(() => {
    for (const tab of tabs) {
      const panel = document.getElementById(tab.panelId);
      if (panel) panel.hidden = tab.key !== activeTab;
    }
    document.querySelector("[data-hono-slides-editor]")?.setAttribute("data-active-editor-tab", activeTab);
  }, [activeTab]);

  return createElement(
    "div",
    { className: "tab-list", role: "tablist", "aria-label": "Editor tools" },
    ...tabs.map((tab) =>
      createElement(
        "button",
        {
          type: "button",
          role: "tab",
          className: "tab-button",
          id: `${tab.key}Tab`,
          "aria-controls": tab.panelId,
          "aria-selected": activeTab === tab.key ? "true" : "false",
          onClick: () => setActiveTab(tab.key),
        },
        tab.label,
      ),
    ),
  );
}

const mount = document.getElementById("editorTabsMount");

if (mount) {
  render(createElement(EditorTabs, null), mount);
}
