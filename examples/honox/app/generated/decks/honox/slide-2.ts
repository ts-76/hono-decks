// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h2: "h2",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx("p", {
      class: "honox-context",
      children: "One deploy / every audience"
    }), "\n", _jsx(_components.h2, {
      children: "Publish the talk once."
    }), "\n", _jsxs("div", {
      class: "honox-audiences",
      children: [_jsx("span", {
        children: "Portfolio"
      }), _jsx("span", {
        children: "Stage"
      }), _jsx("span", {
        children: "Presenter"
      }), _jsx("span", {
        children: "Print"
      })]
    }), "\n", _jsx("p", {
      class: "honox-closing",
      children: "The deck stays part of the site that introduces it."
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
