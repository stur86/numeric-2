/** Serve the built benchmark page (benchmarks/web/dist) locally. */
import { join, normalize } from "path";

const root = join(import.meta.dir, "dist");
const port = Number(process.env.PORT ?? 4321);

Bun.serve({
    port,
    async fetch(req) {
        const path = normalize(new URL(req.url).pathname).replace(/^\/+/, "") || "index.html";
        if (path.startsWith("..")) return new Response("Not found", { status: 404 });
        const file = Bun.file(join(root, path));
        return (await file.exists()) ? new Response(file) : new Response("Not found", { status: 404 });
    },
});
console.log(`Benchmark page: http://localhost:${port}/ (build first with bun run bench:web)`);
