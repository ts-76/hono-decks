// @ts-nocheck
import {jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h1: "h1",
    ...props.components
  };
  return _jsxs("div", {
    class: "minimal-cover",
    children: [_jsx("span", {
      class: "minimal-index",
      children: "00—02"
    }), _jsxs(_components.h1, {
      children: ["Minimal", _jsx("br", {}), "Hono Deck"]
    }), _jsxs("p", {
      children: ["One deck. One facade.", _jsx("br", {}), "One mounted Hono router."]
    }), _jsx("code", {
      children: "app.route(decks.mountPath, decks.router())"
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
