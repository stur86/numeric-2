/** Serve a directory locally (default: the assembled site in build/site). */
import { join, normalize } from "path";

const root = process.argv[2] ?? join(import.meta.dir, "..", "build", "site");
const port = Number(process.env.PORT ?? 4322);

Bun.serve({
    port,
    async fetch(req) {
        let path = normalize(decodeURIComponent(new URL(req.url).pathname)).replace(/^\/+/, "");
        if (path.startsWith("..")) return new Response("Not found", { status: 404 });
        if (path === "" || path.endsWith("/")) path += "index.html";
        let file = Bun.file(join(root, path));
        if (!(await file.exists())) file = Bun.file(join(root, path, "index.html"));
        return (await file.exists()) ? new Response(file) : new Response("Not found", { status: 404 });
    },
});
console.log(`Serving ${root} at http://localhost:${port}/`);
