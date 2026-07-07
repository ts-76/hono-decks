import { jsx } from "hono/jsx/jsx-runtime";
import type { DeckRenderable } from "./compiled-render";

export type DeckControlIconName =
  | "deck-list"
  | "viewer"
  | "projection"
  | "previous"
  | "next"
  | "fullscreen"
  | "export-pdf"
  | "export-png";

export function renderControlIcon(name: DeckControlIconName, className = "hono-decks-control-icon"): DeckRenderable {
  return jsx("svg", {
    class: className,
    "data-hono-decks-control-icon": true,
    viewBox: "0 0 24 24",
    "aria-hidden": "true",
    focusable: "false",
    fill: "none",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    children: controlIconPaths(name),
  });
}

export function renderControlIconHtml(name: DeckControlIconName, className = "hono-decks-control-icon"): string {
  return `<svg class="${className}" data-hono-decks-control-icon viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${controlIconPathHtml(name)}</svg>`;
}

export function controlIconLabel(name: DeckControlIconName): string {
  switch (name) {
    case "deck-list":
      return "Deck list";
    case "viewer":
      return "Viewer";
    case "projection":
      return "Projection";
    case "previous":
      return "Previous slide";
    case "next":
      return "Next slide";
    case "fullscreen":
      return "Toggle fullscreen";
    case "export-pdf":
      return "Export PDF";
    case "export-png":
      return "Export PNG";
  }
}

function controlIconPathHtml(name: DeckControlIconName): string {
  switch (name) {
    case "deck-list":
      return '<path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" />';
    case "viewer":
      return '<rect x="4" y="5" width="16" height="11" rx="2" /><path d="M9 20h6" /><path d="M12 16v4" />';
    case "projection":
      return '<rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />';
    case "previous":
      return '<path d="M15 6l-6 6 6 6" />';
    case "next":
      return '<path d="M9 6l6 6-6 6" />';
    case "fullscreen":
      return '<path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />';
    case "export-pdf":
      return '<path d="M14 3v4a2 2 0 0 0 2 2h4" /><path d="M5 3h9l6 6v12H5z" /><path d="M8 15h8" /><path d="M8 18h5" />';
    case "export-png":
      return '<rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 14l2.5-2.5L14 15l2-2 2 2" /><circle cx="9" cy="9" r="1" />';
  }
}

function controlIconPaths(name: DeckControlIconName): DeckRenderable[] {
  switch (name) {
    case "deck-list":
      return [
        jsx("path", { d: "M4 5h16" }),
        jsx("path", { d: "M4 12h16" }),
        jsx("path", { d: "M4 19h16" }),
      ];
    case "viewer":
      return [
        jsx("rect", { x: "4", y: "5", width: "16", height: "11", rx: "2" }),
        jsx("path", { d: "M9 20h6" }),
        jsx("path", { d: "M12 16v4" }),
      ];
    case "projection":
      return [
        jsx("rect", { x: "3", y: "5", width: "18", height: "12", rx: "2" }),
        jsx("path", { d: "M8 21h8" }),
        jsx("path", { d: "M12 17v4" }),
      ];
    case "previous":
      return [jsx("path", { d: "M15 6l-6 6 6 6" })];
    case "next":
      return [jsx("path", { d: "M9 6l6 6-6 6" })];
    case "fullscreen":
      return [
        jsx("path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }),
        jsx("path", { d: "M16 3h3a2 2 0 0 1 2 2v3" }),
        jsx("path", { d: "M8 21H5a2 2 0 0 1-2-2v-3" }),
        jsx("path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" }),
      ];
    case "export-pdf":
      return [
        jsx("path", { d: "M14 3v4a2 2 0 0 0 2 2h4" }),
        jsx("path", { d: "M5 3h9l6 6v12H5z" }),
        jsx("path", { d: "M8 15h8" }),
        jsx("path", { d: "M8 18h5" }),
      ];
    case "export-png":
      return [
        jsx("rect", { x: "4", y: "5", width: "16", height: "14", rx: "2" }),
        jsx("path", { d: "M8 14l2.5-2.5L14 15l2-2 2 2" }),
        jsx("circle", { cx: "9", cy: "9", r: "1" }),
      ];
  }
}
