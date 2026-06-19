// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    h1: "h1",
    p: "p",
    ...props.components
  }, {LinkCard} = _components;
  if (!LinkCard) _missingMdxReference("LinkCard", true);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "Link card"
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.a, {
        href: "https://zenn.dev/ashunar0/articles/1ba94a110d8622",
        children: "https://zenn.dev/ashunar0/articles/1ba94a110d8622"
      })
    }), "\n", _jsx(LinkCard, {
      href: "https://zenn.dev/ashunar0/articles/1ba94a110d8622",
      title: "Hono でバックエンド API を作るときの個人的ベストプラクティス",
      image: "https://res.cloudinary.com/zenn/image/upload/s--n9GBaqZ7--/c_fit%2Cg_north_west%2Cl_text:notosansjp-medium.otf_55:Hono%2520%25E3%2581%25A7%25E3%2583%2590%25E3%2583%2583%25E3%2582%25AF%25E3%2582%25A8%25E3%2583%25B3%25E3%2583%2589%2520API%2520%25E3%2582%2592%25E4%25BD%259C%25E3%2582%258B%25E3%2581%25A8%25E3%2581%258D%25E3%2581%25AE%25E5%2580%258B%25E4%25BA%25BA%25E7%259A%2584%25E3%2583%2599%25E3%2582%25B9%25E3%2583%2588%25E3%2583%2597%25E3%2583%25A9%25E3%2582%25AF%25E3%2583%2586%25E3%2582%25A3%25E3%2582%25B9%2Cw_1010%2Cx_90%2Cy_100/g_south_west%2Cl_text:notosansjp-medium.otf_37:%25E3%2581%2582%25E3%2581%2595%25E3%2581%25B2%2Cx_203%2Cy_121/g_south_west%2Ch_90%2Cl_fetch:aHR0cHM6Ly9zdGF0aWMuemVubi5zdHVkaW8vdXNlci11cGxvYWQvYXZhdGFyLzZhN2JkYzMxMjIuanBlZw==%2Cr_max%2Cw_90%2Cx_87%2Cy_95/v1627283836/default/og-base-w1200-v2.png?_a=BACMTiAE",
      siteName: "Zenn"
    }), "\n", _jsx(_components.p, {
      children: "Link cards resolve OGP metadata at compile time when available and stay script-free at runtime."
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
