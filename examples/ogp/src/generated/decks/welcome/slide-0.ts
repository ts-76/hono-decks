// @ts-nocheck
import {jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h1: "h1",
    ...props.components
  };
  return _jsxs("div", {
    class: "ogp-cover",
    children: [_jsx("p", {
      children: "1200 × 630 / deterministic PNG"
    }), _jsxs(_components.h1, {
      children: ["Build-time", _jsx("br", {}), "Open Graph images"]
    }), _jsxs("div", {
      children: [_jsx("span", {
        children: "Satori"
      }), _jsx("span", {
        "aria-hidden": "true",
        children: "+"
      }), _jsx("span", {
        children: "resvg"
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
