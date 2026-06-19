// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h2: "h2",
    ...props.components
  }, {MotionMeter} = _components;
  if (!MotionMeter) _missingMdxReference("MotionMeter", true);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h2, {
      children: "Animation island"
    }), "\n", _jsx("p", {
      children: "Client components can own small interactive animation state with hono/jsx/dom."
    }), "\n", _jsx(MotionMeter, {
      label: "Animation island",
      initial: 35
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
