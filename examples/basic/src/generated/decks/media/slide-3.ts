// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
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
      title: "Generic status embed",
      aspectRatio: "4 / 3",
      children: _jsx(_components.p, {
        children: "Open status embed"
      })
    }), "\n", _jsx(_components.p, {
      children: "Generic iframe embeds use the same package defaults."
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
