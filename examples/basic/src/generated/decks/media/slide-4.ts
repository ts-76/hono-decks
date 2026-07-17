// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h1: "h1",
    ...props.components
  }, {TweetEmbed} = _components;
  if (!TweetEmbed) _missingMdxReference("TweetEmbed", true);
  return _jsxs(_Fragment, {
    children: [_jsxs("div", {
      class: "media-heading inline",
      children: [_jsx("p", {
        children: "05 / Social"
      }), _jsx(_components.h1, {
        children: "X post embed"
      })]
    }), "\n", _jsx(TweetEmbed, {
      href: "https://x.com/honojs/status/1659577874821836801?s=20",
      label: "Open post on X"
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
