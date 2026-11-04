/** @jsxImportSource hono/jsx */
import Tabs from "./tabs";
import CodeBlock from "./copy-code";
import { TabPanel } from "../components/docs-content";

export type CodeSample = {
  label: string;
  code: string;
  language?: string;
  filename?: string;
  tokens?: readonly { content: string; kind: string }[];
  copyLabel?: string;
  copiedLabel?: string;
  errorLabel?: string;
};

/** One island owns tabs and copy controls, avoiding nested island hydration. */
export default function CodeGroup({
  samples,
  ariaLabel = "Code examples",
  selectedIndex = 0,
}: {
  samples: readonly CodeSample[];
  ariaLabel?: string;
  selectedIndex?: number;
}) {
  if (!samples.length) return null;
  return (
    <div class="hx-code-group">
      <Tabs labels={samples.map((sample) => sample.label)} ariaLabel={ariaLabel} selectedIndex={selectedIndex}>
        {samples.map(({ label, ...sample }, index) => (
          <TabPanel index={index}>
            <CodeBlock filename={label} {...sample} />
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );
}
