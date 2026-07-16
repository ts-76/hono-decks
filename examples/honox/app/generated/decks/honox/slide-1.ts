// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    h2: "h2",
    li: "li",
    ul: "ul",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h2, {
      children: "Integration boundary"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.code, {
          children: "app/routes"
        }), " owns the HonoX pages"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.code, {
          children: "app/decks.ts"
        }), " hides generated modules"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.code, {
          children: "app/routes/decks/index.ts"
        }), " mounts the deck router"]
      }), "\n"]
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
