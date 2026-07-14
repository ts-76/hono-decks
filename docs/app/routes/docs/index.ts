import { createRoute } from "honox/factory";
import { getLocale, localizedHref } from "../../i18n";

export default createRoute((c) => c.redirect(localizedHref("/docs/getting-started", getLocale(c))));
