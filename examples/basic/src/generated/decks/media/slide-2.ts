// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h1: "h1",
    ...props.components
  }, {EmbedFrame} = _components;
  if (!EmbedFrame) _missingMdxReference("EmbedFrame", true);
  return _jsxs(_Fragment, {
    children: [_jsxs("div", {
      class: "media-heading inline",
      children: [_jsx("p", {
        children: "03 / Video"
      }), _jsx(_components.h1, {
        children: "YouTube embed"
      })]
    }), "\n", _jsx(EmbedFrame, {
      provider: "youtube",
      src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      fallbackHref: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "YouTube embed example",
      children: "Open YouTube embed"
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
