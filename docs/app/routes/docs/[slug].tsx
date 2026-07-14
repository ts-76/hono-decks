import { createRoute } from "honox/factory";
import { getGuide } from "../../guides";
import { DocsLayout } from "../../site";

export default createRoute((c) => {
  const slug = c.req.param("slug") ?? "";
  const guide = getGuide(slug);
  if (!guide) return c.notFound();
  const activePath = `/docs/${slug}`;
  return c.render(
    <DocsLayout activePath={activePath} title={guide.title} description={guide.description}>
      {guide.content}
    </DocsLayout>,
    { title: guide.title, description: guide.description, activePath },
  );
});
