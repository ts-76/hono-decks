import { languageDetector } from "hono/language";
import { createRoute } from "honox/factory";
import docsSite from "../docs.config";

export default createRoute(
  languageDetector({
    order: ["querystring", "cookie", "header"],
    lookupQueryString: "lang",
    lookupCookie: "language",
    caches: ["cookie"],
    cookieOptions: {
      path: "/",
      sameSite: "Lax",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
    },
    supportedLanguages: Object.keys(docsSite.localeLabels),
    fallbackLanguage: docsSite.defaultLocale,
  }),
);
