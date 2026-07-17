// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
export const badgeLabel = 'Rendered ' + 'by a Hono JSX component';
export const topics = ['MDX expression props', 'MDX expression children'];
function _createMdxContent(props) {
  const _components = {
    h1: "h1",
    ...props.components
  }, {Badge, Counter, Hero} = _components;
  if (!Badge) _missingMdxReference("Badge", true);
  if (!Counter) _missingMdxReference("Counter", true);
  if (!Hero) _missingMdxReference("Hero", true);
  return _jsxs(_Fragment, {
    children: [_jsxs("div", {
      class: "sample-cover",
      children: [_jsxs("div", {
        children: [_jsx("p", {
          class: "sample-context",
          children: "Hono × MDX × Cloudflare Workers"
        }), _jsx(_components.h1, {
          children: "Hono Slides"
        }), _jsxs("p", {
          class: "sample-lede",
          children: ["登壇資料を、アプリの外側ではなく", _jsx("br", {}), "Honoのルートとして届ける。"]
        })]
      }), _jsx("div", {
        class: "sample-mark",
        "aria-hidden": "true",
        children: "H"
      })]
    }), "\n", _jsxs("div", {
      class: "sample-runtime",
      children: [_jsx("span", {
        children: "Build with Node.js"
      }), _jsx("span", {
        children: "Serve with Hono"
      }), _jsx("span", {
        children: "Present anywhere"
      })]
    }), "\n", _jsx(Hero, {
      title: "MDX-like components"
    }), "\n", _jsxs("div", {
      class: "sample-component-proof",
      children: [_jsx(Badge, {
        label: badgeLabel
      }), topics.map(topic => _jsx(Badge, {
        label: topic
      })), _jsx(Counter, {
        label: "Interactive count",
        initial: 1
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
