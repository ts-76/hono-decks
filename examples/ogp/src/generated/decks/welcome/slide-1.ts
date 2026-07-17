// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h2: "h2",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h2, {
      children: "One source of truth"
    }), "\n", _jsxs("div", {
      class: "ogp-flow",
      children: [_jsxs("section", {
        children: [_jsx("code", {
          children: "deck.mdx"
        }), _jsxs("strong", {
          children: ["title", _jsx("br", {}), "description", _jsx("br", {}), "author"]
        })]
      }), _jsx("span", {
        "aria-hidden": "true",
        children: "→"
      }), _jsxs("section", {
        children: [_jsx("code", {
          children: "compile"
        }), _jsxs("strong", {
          children: ["manifest", _jsx("br", {}), "paths", _jsx("br", {}), "metadata"]
        })]
      }), _jsx("span", {
        "aria-hidden": "true",
        children: "→"
      }), _jsxs("section", {
        class: "is-accent",
        children: [_jsx("code", {
          children: "og.png"
        }), _jsxs("strong", {
          children: ["1200 × 630", _jsx("br", {}), "social-ready"]
        })]
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
