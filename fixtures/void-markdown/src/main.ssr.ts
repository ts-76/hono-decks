import { defineRender } from "void";
export default defineRender(() => new Response("Not found", { status: 404 }));
