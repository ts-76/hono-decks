import { createRoute } from "honox/factory";
import { getDocument } from "../../docs-catalog";
import { getLocale } from "../../i18n";

export default createRoute((c) => {
  const slug = c.req.param("slug") ?? "";
  if (slug === "api") return c.notFound();
  const document = getDocument(slug, getLocale(c));
  if (!document) return c.notFound();
  const { Content, page } = document;
  return c.render(<Content />, {
    title: page.title,
    description: page.description,
    activePath: `/docs/${slug}`,
  });
});
