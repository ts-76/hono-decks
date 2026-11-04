import { defineConfig } from "vite";
import { voidPlugin } from "void";
import { honoDecks } from "hono-decks/vite";

export default defineConfig({ plugins: [honoDecks(), voidPlugin()] });
