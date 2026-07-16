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
      children: "Code verification"
    }), "\n", _jsx(CodeBlock, {
      lang: "ts",
      highlightedHtml: "<pre class=\"shiki github-dark\" style=\"background-color:#24292e;color:#e1e4e8\" tabindex=\"0\"><code><span class=\"line\"><span style=\"color:#F97583\">const</span><span style=\"color:#79B8FF\"> view</span><span style=\"color:#F97583\"> =</span><span style=\"color:#E1E4E8\"> &#x3C;</span><span style=\"color:#B392F0\">Slide</span><span style=\"color:#B392F0\"> title</span><span style=\"color:#F97583\">=</span><span style=\"color:#9ECBFF\">\"Hello\"</span><span style=\"color:#E1E4E8\"> /></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"color:#E1E4E8\">export function labels(</span><span style=\"color:#FFAB70\">items</span><span style=\"color:#F97583\">:</span><span style=\"color:#B392F0\"> Array</span><span style=\"color:#E1E4E8\">&#x3C;{ </span><span style=\"color:#FFAB70\">id</span><span style=\"color:#F97583\">:</span><span style=\"color:#79B8FF\"> string</span><span style=\"color:#E1E4E8\"> }>) {</span></span>\n<span class=\"line\"><span style=\"color:#E1E4E8\">  return items.map((item) => item.id).join(</span><span style=\"color:#9ECBFF\">\", \"</span><span style=\"color:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"color:#E1E4E8\">}</span></span></code></pre>",
      children: "const view = <Slide title=\"Hello\" />\n\nexport function labels(items: Array<{ id: string }>) {\nreturn items.map((item) => item.id).join(\", \")\n}"
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
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
