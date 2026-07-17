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
    children: [_jsx(_components.h2, {
      children: "Build once. Mount everywhere."
    }), "\n", _jsx("p", {
      class: "sample-subtitle",
      children: "ファイルI/Oはbuild時に閉じ込め、runtimeはHonoのまま軽く保つ。"
    }), "\n", _jsxs("div", {
      class: "sample-pipeline",
      children: [_jsxs("section", {
        children: [_jsx("strong", {
          children: "01"
        }), _jsx("h3", {
          children: "Author"
        }), _jsx("p", {
          children: "MDXとアセットを書く"
        })]
      }), _jsx("span", {
        "aria-hidden": "true",
        children: "→"
      }), _jsxs("section", {
        children: [_jsx("strong", {
          children: "02"
        }), _jsx("h3", {
          children: "Compile"
        }), _jsx("p", {
          children: "Hono JSXへ生成する"
        })]
      }), _jsx("span", {
        "aria-hidden": "true",
        children: "→"
      }), _jsxs("section", {
        children: [_jsx("strong", {
          children: "03"
        }), _jsx("h3", {
          children: "Mount"
        }), _jsx("p", {
          children: "既存アプリにrouteする"
        })]
      })]
    }), "\n", _jsx("img", {
      class: "sample-asset",
      src: "/decks/sample/assets/r2-cache.svg",
      alt: "R2-backed local asset pipeline"
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
