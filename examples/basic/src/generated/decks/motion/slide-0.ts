// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const {Fragment} = props.components || ({});
  if (!Fragment) _missingMdxReference("Fragment", true);
  return _jsxs(_Fragment, {
    children: [_jsx("style", {
      children: `
.motion-stage{display:grid;grid-template-columns:minmax(0,1fr) 18rem;gap:2rem;align-items:center;height:100%}
.motion-orbit{position:relative;inline-size:15rem;block-size:15rem;border:1px solid rgba(139,211,255,.34);border-radius:999px;background:rgba(8,47,73,.34)}
.motion-orbit::before{content:"";position:absolute;inset:1.1rem;border:1px dashed rgba(223,247,255,.48);border-radius:inherit}
.motion-orbit-dot{position:absolute;inset-block-start:50%;inset-inline-start:50%;inline-size:2.25rem;block-size:2.25rem;margin:-1.125rem;border-radius:999px;background:#8bd3ff;box-shadow:0 0 2.25rem rgba(139,211,255,.76);animation:hono-decks-motion-orbit 4s linear infinite}
@keyframes hono-decks-motion-orbit{from{transform:rotate(0deg) translateX(5.7rem) rotate(0deg)}to{transform:rotate(360deg) translateX(5.7rem) rotate(-360deg)}}
@media (prefers-reduced-motion: reduce){.motion-orbit-dot{animation:none;transform:translateX(5.7rem)}}
`
    }), "\n", _jsxs("div", {
      class: "motion-stage",
      children: [_jsxs("div", {
        children: [_jsx("h1", {
          children: "Motion verification"
        }), _jsx("p", {
          children: "CSS animation stays inside the fixed 16:9 slide and respects reduced motion."
        }), _jsx(Fragment, {
          order: 1,
          children: "The reveal state is owned by the presentation iframe."
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
