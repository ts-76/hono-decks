type MDXComponents = Record<string, unknown>;

// honoxpress:components:start
import { Accordion, AccordionItem, Callout, Card, Cards, Steps, Step, TabPanel } from "./components/docs-content";
import Tabs from "./islands/tabs";
import CodeBlock from "./islands/copy-code";
import DemoFrame from "./components/demo-frame";
import { FileTree, File, Folder } from "./components/file-tree";
import { TypeTable } from "./components/type-table";
import { Figure } from "./components/figure";
import { ThemeSwitch } from "./components/theme-switch";
import { DefinitionList } from "./components/definition-list";
import { APIReference } from "./components/api-reference";
import CodeGroup from "./islands/code-group";
export const standardComponents = {
  Accordion,
  AccordionItem,
  APIReference,
  Callout,
  Card,
  Cards,
  CodeBlock,
  CodeGroup,
  DefinitionList,
  DemoFrame,
  Figure,
  File,
  FileTree,
  Folder,
  Step,
  Steps,
  TabPanel,
  Tabs,
  ThemeSwitch,
  TypeTable,
};
// honoxpress:components:end

import { DeployToCloudflare } from "./site";
import { MarkdownTable } from "./components/markdown-table";
export const components = { ...standardComponents, DeployToCloudflare, MarkdownTable, table: MarkdownTable };

export function useMDXComponents(overrides: MDXComponents = {}): MDXComponents {
  return { ...components, ...overrides };
}
