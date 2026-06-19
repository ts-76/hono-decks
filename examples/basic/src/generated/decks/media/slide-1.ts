// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h1: "h1",
    p: "p",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "R2-backed image"
    }), "\n", _jsx("img", {
      class: "media-image",
      src: "/decks/media/assets/r2-remote.svg",
      alt: "R2-backed media asset"
    }), "\n", _jsx(_components.p, {
      children: "The generated asset URL renders locally and can be served from an R2 binding with long-lived cache headers."
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
