import { createRoute } from "honox/factory";
import { getDocument } from "../docs-catalog";
import { getLocale } from "../i18n";

export default createRoute((c) => {
  const document = getDocument("api", getLocale(c));
  if (!document) return c.notFound();
  const { Content, page } = document;
  return c.render(<Content />, { title: page.title, description: page.description, activePath: "/api" });
});
