// @ts-nocheck
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "hono/jsx/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h2: "h2",
    p: "p",
    ...props.components
  }, {CodeBlock} = _components;
  if (!CodeBlock) _missingMdxReference("CodeBlock", true);
  return _jsxs(_Fragment, {
    children: [_jsxs("div", {
      class: "code-heading compact",
      children: [_jsx("p", {
        children: "Component API"
      }), _jsx(_components.h2, {
        children: "CodeBlock component"
      })]
    }), "\n", _jsx(CodeBlock, {
      lang: "ts",
      filename: "worker.ts",
      highlight: "2",
      highlightedHtml: "<pre class=\"shiki github-dark\" style=\"background-color:#24292e;color:#e1e4e8\" tabindex=\"0\"><code><span class=\"line\"><span style=\"color:#F97583\">const</span><span style=\"color:#79B8FF\"> app</span><span style=\"color:#F97583\"> =</span><span style=\"color:#F97583\"> new</span><span style=\"color:#B392F0\"> Hono</span><span style=\"color:#E1E4E8\">()</span></span>\n<span class=\"line\"><span style=\"color:#E1E4E8\">app.</span><span style=\"color:#B392F0\">get</span><span style=\"color:#E1E4E8\">(</span><span style=\"color:#9ECBFF\">\"/\"</span><span style=\"color:#E1E4E8\">, (</span><span style=\"color:#FFAB70\">c</span><span style=\"color:#E1E4E8\">) </span><span style=\"color:#F97583\">=></span><span style=\"color:#E1E4E8\"> c.</span><span style=\"color:#B392F0\">text</span><span style=\"color:#E1E4E8\">(</span><span style=\"color:#9ECBFF\">\"ok\"</span><span style=\"color:#E1E4E8\">))</span></span></code></pre>",
      children: _jsx(_components.p, {
        children: "const app = new Hono()\napp.get(\"/\", (c) => c.text(\"ok\"))"
      })
    }), "\n", _jsxs("div", {
      class: "code-proof",
      children: [_jsx("span", {
        children: "filename"
      }), _jsx("span", {
        children: "highlight"
      }), _jsx("span", {
        children: "build-time Shiki"
      })]
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
