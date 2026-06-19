// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    h1: "h1",
    p: "p",
    ...props.components
  }, {EmbedFrame} = _components;
  if (!EmbedFrame) _missingMdxReference("EmbedFrame", true);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "Generic iframe"
    }), "\n", _jsx(EmbedFrame, {
      src: "https://example.com/embed/status",
      title: "Embedded content",
      children: "Open embed"
    }), "\n", _jsx(_components.p, {
      children: "Generic iframe embeds use the same package defaults."
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.a, {
        href: "https://example.com/plain-link",
        children: "https://example.com/plain-link"
      })
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
