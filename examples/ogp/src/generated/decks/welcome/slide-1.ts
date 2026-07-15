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
      children: "One source of truth"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Deck title, description, and author come from frontmatter"
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.code, {
          children: "decks.paths(slug).ogImage"
        }), " defines the public image URL"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.code, {
          children: "viewer.openGraph"
        }), " emits absolute social metadata"]
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
