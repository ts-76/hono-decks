// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h2: "h2",
    p: "p",
    ...props.components
  }, {Fire} = _components;
  if (!Fire) _missingMdxReference("Fire", true);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h2, {
      children: "Queued navigation"
    }), "\n", _jsx(_components.p, {
      children: "Rapid commands during a slide transition are folded into the latest pending navigation."
    }), "\n", _jsx(Fire, {
      effect: "fade-up",
      children: _jsx(_components.p, {
        children: "The outgoing slide keeps sliding with the incoming slide's transition timing."
      })
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
