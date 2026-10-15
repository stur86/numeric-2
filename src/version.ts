/**
 * The library version. It comes from package.json and is inlined as a string
 * constant when the bundles are built (the named import keeps only the version
 * field, not the rest of package.json), so it always matches the release.
 */
import { version as packageVersion } from "../package.json";

export const version: string = packageVersion;
