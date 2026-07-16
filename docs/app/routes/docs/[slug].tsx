import { createRoute } from "honox/factory";
import { getGuide } from "../../guides";
import { getLocale } from "../../i18n";
import { DocsLayout } from "../../site";

export default createRoute((c) => {
  const slug = c.req.param("slug") ?? "";
  const locale = getLocale(c);
  const guide = getGuide(slug, locale);
  if (!guide) return c.notFound();
  const activePath = `/docs/${slug}`;
  return c.render(
    <DocsLayout activePath={activePath} title={guide.title} description={guide.description} sections={guide.sections} locale={locale}>
      {guide.content}
    </DocsLayout>,
    { title: guide.title, description: guide.description, activePath },
  );
});
