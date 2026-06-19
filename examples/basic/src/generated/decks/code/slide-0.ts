// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    h1: "h1",
    p: "p",
    pre: "pre",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "Code verification"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        class: "language-ts",
        children: "const view = <Slide title=\"Hello\" />\n\nexport function labels(items: Array<{ id: string }>) {\n  return items.map((item) => item.id).join(\", \")\n}\n"
      })
    }), "\n", _jsx(_components.p, {
      children: "Fenced code should preserve whitespace, escape HTML-like syntax, and scroll instead of breaking the fixed canvas."
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
