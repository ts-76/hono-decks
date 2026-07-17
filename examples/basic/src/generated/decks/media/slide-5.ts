// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    h1: "h1",
    p: "p",
    ...props.components
  }, {LinkCard} = _components;
  if (!LinkCard) _missingMdxReference("LinkCard", true);
  return _jsxs(_Fragment, {
    children: [_jsxs("div", {
      class: "media-heading inline",
      children: [_jsx("p", {
        children: "06 / Compile-time metadata"
      }), _jsx(_components.h1, {
        children: "Link card"
      })]
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.a, {
        href: "https://yusukebe.com/",
        children: "https://yusukebe.com/"
      })
    }), "\n", _jsx(LinkCard, {
      href: "https://yusukebe.com/",
      title: "ゆーすけべー日記",
      description: "ゆーすけべーの名前で活動しています。天然パーマです。",
      image: "https://yusukebe.com/icons/myicon.png"
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
