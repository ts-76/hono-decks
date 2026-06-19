// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h1: "h1",
    p: "p",
    ...props.components
  }, {CodeBlock} = _components;
  if (!CodeBlock) _missingMdxReference("CodeBlock", true);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "CodeBlock component"
    }), "\n", _jsx(CodeBlock, {
      lang: "ts",
      filename: "worker.ts",
      highlight: "2",
      children: _jsx(_components.p, {
        children: "const app = new Hono()\napp.get(\"/\", (c) => c.text(\"ok\"))"
      })
    }), "\n", _jsx(_components.p, {
      children: "The built-in component should keep code authoring close to the deck source."
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
