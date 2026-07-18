import { jsx } from "hono/jsx/jsx-runtime";
import type { DeckRenderable } from "./compiled-render";

export type DeckControlIconName =
  | "deck-list"
  | "home"
  | "viewer"
  | "projection"
  | "presenter"
  | "previous"
  | "next"
  | "fullscreen"
  | "external-link"
  | "print"
  | "details"
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
    case "home":
      return "Home";
    case "viewer":
      return "Viewer";
    case "projection":
      return "Projection";
    case "presenter":
      return "Presenter";
    case "previous":
      return "Previous slide";
    case "next":
      return "Next slide";
    case "fullscreen":
      return "Toggle fullscreen";
    case "external-link":
      return "Open link in new tab";
    case "print":
      return "Print view";
    case "details":
      return "Details";
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
    case "home":
      return '<path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" />';
    case "viewer":
      return '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />';
    case "projection":
      return '<path d="M4 5h16v10H4z" /><path d="M8 19h8" /><path d="M12 15v4" />';
    case "presenter":
      return '<path d="M4 5h16v10H4z" /><path d="M8 21l4-6 4 6" /><path d="M9 9h6" />';
    case "previous":
      return '<path d="M15 6l-6 6 6 6" />';
    case "next":
      return '<path d="M9 6l6 6-6 6" />';
    case "fullscreen":
      return '<path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />';
    case "external-link":
      return '<path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />';
    case "print":
      return '<path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" />';
    case "details":
      return '<circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" />';
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
    case "home":
      return [
        jsx("path", { d: "M3 11l9-8 9 8" }),
        jsx("path", { d: "M5 10v10h14V10" }),
        jsx("path", { d: "M9 20v-6h6v6" }),
      ];
    case "viewer":
      return [
        jsx("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" }),
        jsx("circle", { cx: "12", cy: "12", r: "3" }),
      ];
    case "projection":
      return [
        jsx("path", { d: "M4 5h16v10H4z" }),
        jsx("path", { d: "M8 19h8" }),
        jsx("path", { d: "M12 15v4" }),
      ];
    case "presenter":
      return [
        jsx("path", { d: "M4 5h16v10H4z" }),
        jsx("path", { d: "M8 21l4-6 4 6" }),
        jsx("path", { d: "M9 9h6" }),
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
    case "external-link":
      return [
        jsx("path", { d: "M15 3h6v6" }),
        jsx("path", { d: "M10 14 21 3" }),
        jsx("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }),
      ];
    case "print":
      return [
        jsx("path", { d: "M6 9V3h12v6" }),
        jsx("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
        jsx("path", { d: "M6 14h12v7H6z" }),
      ];
    case "details":
      return [
        jsx("circle", { cx: "12", cy: "12", r: "9" }),
        jsx("path", { d: "M12 11v5" }),
        jsx("path", { d: "M12 8h.01" }),
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
