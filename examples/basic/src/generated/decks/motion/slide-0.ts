// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    p: "p",
    ...props.components
  }, {Fire} = _components;
  if (!Fire) _missingMdxReference("Fire", true);
  return _jsxs(_Fragment, {
    children: [_jsx("style", {
      children: `
.motion-stage{display:grid;grid-template-columns:minmax(0,1fr) 18rem;gap:3rem;align-items:center;height:100%}
.motion-orbit{position:relative;inline-size:15rem;block-size:15rem;border:1px solid rgba(255,122,61,.45);border-radius:999px;background:#17191f}
.motion-orbit::before{content:"";position:absolute;inset:1.1rem;border:1px dashed rgba(255,240,230,.34);border-radius:inherit}
.motion-orbit::after{content:"CSS";position:absolute;inset:0;display:grid;place-items:center;color:#fff0e6;font-size:1.35rem;font-weight:760;letter-spacing:-.03em}
.motion-orbit-dot{position:absolute;z-index:2;inset-block-start:50%;inset-inline-start:50%;inline-size:2.25rem;block-size:2.25rem;margin:-1.125rem;border-radius:999px;background:#ff6b2c;box-shadow:0 0 1.4rem rgba(255,107,44,.62);animation:hono-decks-motion-orbit 4s linear infinite}
@keyframes hono-decks-motion-orbit{from{transform:rotate(0deg) translateX(5.7rem) rotate(0deg)}to{transform:rotate(360deg) translateX(5.7rem) rotate(-360deg)}}
@media (prefers-reduced-motion: reduce){.motion-orbit-dot{animation:none;transform:translateX(5.7rem)}}
`
    }), "\n", _jsxs("div", {
      class: "motion-stage",
      children: [_jsxs("div", {
        children: [_jsx("p", {
          class: "motion-context",
          children: "CSS first / accessible by default"
        }), _jsx("h1", {
          children: "Motion verification"
        }), _jsxs("p", {
          children: ["Animation stays inside the 16", ":9", " canvas and yields to the viewer's reduced-motion policy."]
        }), _jsxs(Fire, {
          effect: "fade-up",
          children: [_jsx(_components.p, {
            children: "The reveal state is owned by the presentation iframe."
          }), _jsx(_components.p, {
            children: "Markdown fire blocks use Zenn-style directive syntax."
          })]
        })]
      }), _jsx("div", {
        class: "motion-orbit",
        "aria-label": "CSS orbit animation",
        children: _jsx("span", {
          class: "motion-orbit-dot"
        })
      })]
    })]
  });
}
export default function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, {
    ...props,
    children: _jsx(_createMdxContent, {
      ...props
    })
  }) : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
