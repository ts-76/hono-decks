// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
export const badgeLabel = 'Rendered ' + 'by a Hono JSX component';
export const topics = ['MDX expression props', 'MDX expression children'];
function _createMdxContent(props) {
  const _components = {
    h2: "h2",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx("p", {
      class: "sample-context",
      children: "One source. Every surface."
    }), "\n", _jsxs(_components.h2, {
      children: ["閲覧・発表・配布まで、", _jsx("br", {}), "自分のHonoアプリで。"]
    }), "\n", _jsxs("div", {
      class: "sample-route-list",
      children: [_jsx("code", {
        children: "/viewer"
      }), _jsx("code", {
        children: "/presentation"
      }), _jsx("code", {
        children: "/presenter"
      }), _jsx("code", {
        children: "/print"
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
