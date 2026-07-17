// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h1: "h1",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsxs("div", {
      class: "media-heading",
      children: [_jsx("p", {
        children: "02 / R2 asset source"
      }), _jsx(_components.h1, {
        children: "R2-backed image"
      })]
    }), "\n", _jsxs("div", {
      class: "media-showcase reverse",
      children: [_jsx("img", {
        class: "media-image",
        src: "/decks/media/assets/r2-remote.svg",
        alt: "R2-backed media asset"
      }), _jsxs("p", {
        children: ["One authoring path.", _jsx("br", {}), _jsx("strong", {
          children: "Edge-cached delivery."
        })]
      })]
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
