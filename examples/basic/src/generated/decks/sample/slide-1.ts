// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
export const badgeLabel = 'Rendered ' + 'by a Hono JSX component';
export const topics = ['MDX expression props', 'MDX expression children'];
function _createMdxContent(props) {
  const _components = {
    h2: "h2",
    li: "li",
    ul: "ul",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h2, {
      children: "Parse and View"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Markdown/MDX-like source を compile"
      }), "\n", _jsx(_components.li, {
        children: "deck manifest と slide metadata を保持"
      }), "\n", _jsx(_components.li, {
        children: "Hono route で viewer/render page を配信"
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
