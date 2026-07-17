// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h2: "h2",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsxs(_components.h2, {
      children: ["Three files,", _jsx("br", {}), "every presentation surface."]
    }), "\n", _jsxs("div", {
      class: "minimal-stack",
      children: [_jsxs("section", {
        children: [_jsx("strong", {
          children: "deck.mdx"
        }), _jsx("span", {
          children: "author"
        })]
      }), _jsxs("section", {
        children: [_jsx("strong", {
          children: "generated/decks.ts"
        }), _jsx("span", {
          children: "compile"
        })]
      }), _jsxs("section", {
        children: [_jsx("strong", {
          children: "src/index.ts"
        }), _jsx("span", {
          children: "mount"
        })]
      })]
    }), "\n", _jsx("p", {
      class: "minimal-result",
      children: "Viewer · render · presentation · presenter · print"
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
