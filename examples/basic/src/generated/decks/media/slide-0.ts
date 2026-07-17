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
        children: "01 / Local asset"
      }), _jsx(_components.h1, {
        children: "Media verification"
      })]
    }), "\n", _jsxs("div", {
      class: "media-showcase",
      children: [_jsx("img", {
        class: "media-image",
        src: "/decks/media/assets/local-jsx.svg",
        alt: "Local JSX asset"
      }), _jsxs("p", {
        children: ["Relative in MDX.", _jsx("br", {}), _jsx("strong", {
          children: "Public after compile."
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
