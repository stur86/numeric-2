/**
 * The version the website describes: $SITE_VERSION (the release tag, set by
 * the Pages workflow), else the tag on HEAD, else `dev-<short sha>`.
 */
import { join } from "path";

const root = join(import.meta.dir, "..");

function git(...args: string[]): string | null {
    const p = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "ignore" });
    const out = p.stdout.toString().trim();
    return p.exitCode === 0 && out !== "" ? out : null;
}

export function siteVersion(): string {
    const env = process.env.SITE_VERSION?.trim();
    if (env) return env;
    const tag = git("describe", "--tags", "--exact-match", "HEAD");
    if (tag !== null) return tag;
    const sha = git("rev-parse", "--short", "HEAD");
    return sha !== null ? `dev-${sha}` : "dev";
}
