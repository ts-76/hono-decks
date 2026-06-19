// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    h1: "h1",
    p: "p",
    ...props.components
  }, {LinkCard} = _components;
  if (!LinkCard) _missingMdxReference("LinkCard", true);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "Link card"
    }), "\n", _jsx(LinkCard, {
      href: "https://hono.dev/docs/"
    }), "\n", _jsxs(_components.p, {
      children: ["Link cards stay script-free by default and can be replaced through ", _jsx(_components.code, {
        children: "theme.components"
      }), "."]
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
