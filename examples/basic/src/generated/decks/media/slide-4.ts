// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    h1: "h1",
    p: "p",
    ...props.components
  }, {SocialEmbed, TweetEmbed} = _components;
  if (!SocialEmbed) _missingMdxReference("SocialEmbed", true);
  if (!TweetEmbed) _missingMdxReference("TweetEmbed", true);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "X post embed"
    }), "\n", _jsx(SocialEmbed, {
      provider: "x",
      href: "https://x.com/honojs/status/123",
      label: "Open on X"
    }), "\n", _jsx(TweetEmbed, {
      href: "https://x.com/honojs/status/1659577874821836801?s=20",
      label: "Open post on X"
    }), "\n", _jsxs(_components.p, {
      children: [_jsx(_components.code, {
        children: "@[x]"
      }), " renders a script-free fallback. ", _jsx(_components.code, {
        children: "@[x-post]"
      }), " opts into the official post embed markup."]
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
