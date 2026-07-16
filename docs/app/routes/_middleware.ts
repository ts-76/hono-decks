import { languageDetector } from "hono/language";
import { createRoute } from "honox/factory";

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
    supportedLanguages: ["ja", "en"],
    fallbackLanguage: "en",
  }),
);
