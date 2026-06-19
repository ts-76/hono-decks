// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h1: "h1",
    p: "p",
    ...props.components
  }, {SocialEmbed} = _components;
  if (!SocialEmbed) _missingMdxReference("SocialEmbed", true);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "SNS fallback"
    }), "\n", _jsx(SocialEmbed, {
      href: "https://x.com/honojs/status/123",
      provider: "x",
      author: "@honojs",
      label: "Open on X",
      children: _jsx(_components.p, {
        children: "Script-based SNS embeds stay link-first by default."
      })
    }), "\n", _jsx(_components.p, {
      children: "The package renders a script-free fallback. Apps can opt into third-party scripts and CSP rules in their own viewer routes."
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
