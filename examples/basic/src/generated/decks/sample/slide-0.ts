// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
export const badgeLabel = 'Rendered ' + 'by a Hono JSX component';
export const topics = ['MDX expression props', 'MDX expression children'];
function _createMdxContent(props) {
  const _components = {
    h1: "h1",
    p: "p",
    ...props.components
  }, {Badge, Hero} = _components;
  if (!Badge) _missingMdxReference("Badge", true);
  if (!Hero) _missingMdxReference("Hero", true);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "Hono Slides"
    }), "\n", _jsx(_components.p, {
      children: "Cloudflare Workers で動く Slidev-like deck"
    }), "\n", _jsx(Hero, {
      title: "MDX-like components"
    }), "\n", _jsx(Badge, {
      label: badgeLabel
    }), "\n", topics.map(topic => _jsx(Badge, {
      label: topic
    }))]
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
