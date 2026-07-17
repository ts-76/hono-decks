// @ts-nocheck
import {jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h1: "h1",
    ...props.components
  };
  return _jsxs("div", {
    class: "honox-cover",
    children: [_jsx("p", {
      children: "HonoX portfolio pattern"
    }), _jsxs(_components.h1, {
      children: ["HonoX +", _jsx("br", {}), "hono-decks"]
    }), _jsxs("span", {
      children: ["Pages and presentations,", _jsx("br", {}), "one Hono application."]
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
