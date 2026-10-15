/**
 * Check that a release tag matches the version in package.json: the tag must
 * be "v" followed by that version (e.g. v1.2.3 for "1.2.3"), and the version
 * must be valid semver.
 *
 *   bun run scripts/check-version.ts v1.2.3
 */
import { join } from "path";

const tag = process.argv[2] ?? "";
const pkg = await Bun.file(join(import.meta.dir, "..", "package.json")).json();
const version: unknown = pkg.version;

// Semantic Versioning 2.0.0 (semver.org), without build metadata
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;

let error: string | null = null;
if (typeof version !== "string" || !SEMVER.test(version)) {
    error = `package.json version ${JSON.stringify(version)} is not a valid semver version`;
} else if (tag !== `v${version}`) {
    error = `tag ${JSON.stringify(tag)} does not match package.json version ${version} (expected v${version})`;
}
if (error !== null) {
    console.error(`::error::${error}`);
    process.exit(1);
}
console.log(`Tag ${tag} matches package.json version ${version}`);
