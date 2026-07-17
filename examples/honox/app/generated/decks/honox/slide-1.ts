// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h2: "h2",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsxs(_components.h2, {
      children: ["A clear boundary,", _jsx("br", {}), "not a second app."]
    }), "\n", _jsxs("div", {
      class: "honox-boundary",
      children: [_jsxs("section", {
        children: [_jsx("code", {
          children: "app/routes"
        }), _jsx("strong", {
          children: "Portfolio pages"
        }), _jsx("span", {
          children: "HonoX owns navigation and SEO."
        })]
      }), _jsxs("section", {
        children: [_jsx("code", {
          children: "app/decks.ts"
        }), _jsx("strong", {
          children: "Stable facade"
        }), _jsx("span", {
          children: "Generated modules stay behind one import."
        })]
      }), _jsxs("section", {
        children: [_jsx("code", {
          children: "/decks"
        }), _jsx("strong", {
          children: "Presentation routes"
        }), _jsx("span", {
          children: "Viewer, stage, presenter, and print."
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
