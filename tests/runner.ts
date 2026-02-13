/**
 * TypeScript helper for spawning the Python NumPy oracle and parsing results.
 *
 * Spawns `uv run python oracle.py` in the tests/ directory, sends NDJSON
 * requests on stdin, and parses NDJSON responses from stdout.
 */

import { spawn, type Subprocess } from "bun";
import { join } from "path";

export type OracleRequest =
    | { op: string; seed: number; n: number; variant?: string }
    | { op: "dot"; variant: string; seed: number; n?: number; m?: number; p?: number }
    | { op: "solve" | "inv" | "det"; seed: number; n: number };

export type OracleResponse = {
    inputs: Record<string, number | number[] | number[][]>;
    expected: number | number[] | number[][];
};

const testsDir = import.meta.dir;

let proc: Subprocess<"pipe", "pipe", "inherit"> | null = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let buffer = "";
const decoder = new TextDecoder();

// Queue of pending line resolvers
let lineResolvers: Array<(line: string) => void> = [];
let readLoopRunning = false;
let streamDone = false;

async function ensureProc() {
    if (proc && !proc.killed) return;

    proc = spawn(["uv", "run", "python", join(testsDir, "oracle.py")], {
        cwd: testsDir,
        stdin: "pipe",
        stdout: "pipe",
        stderr: "inherit",
    });
    reader = proc.stdout.getReader();
    buffer = "";
    lineResolvers = [];
    readLoopRunning = false;
    streamDone = false;
}

function drainBuffer() {
    while (lineResolvers.length > 0) {
        const nlIndex = buffer.indexOf("\n");
        if (nlIndex === -1) break;
        const line = buffer.slice(0, nlIndex);
        buffer = buffer.slice(nlIndex + 1);
        const resolve = lineResolvers.shift()!;
        resolve(line);
    }
}

async function startReadLoop() {
    if (readLoopRunning || streamDone) return;
    readLoopRunning = true;

    try {
        while (lineResolvers.length > 0 && !streamDone) {
            const { value, done } = await reader!.read();
            if (done) {
                streamDone = true;
                // Reject remaining resolvers
                for (const r of lineResolvers) {
                    // Can't reject with resolve, so use the last line if available
                }
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            drainBuffer();
        }
    } finally {
        readLoopRunning = false;
    }
}

function readLine(): Promise<string> {
    // Check if we already have a complete line in the buffer
    const nlIndex = buffer.indexOf("\n");
    if (nlIndex !== -1) {
        const line = buffer.slice(0, nlIndex);
        buffer = buffer.slice(nlIndex + 1);
        return Promise.resolve(line);
    }

    return new Promise<string>((resolve) => {
        lineResolvers.push(resolve);
        startReadLoop();
    });
}

/**
 * Send a single request to the oracle and return the parsed response.
 */
export async function oracle(req: OracleRequest): Promise<OracleResponse> {
    await ensureProc();
    const line = JSON.stringify(req) + "\n";
    proc!.stdin.write(line);
    proc!.stdin.flush();

    const responseLine = await readLine();
    return JSON.parse(responseLine);
}

/**
 * Send a batch of requests and return all responses.
 */
export async function oracleBatch(reqs: OracleRequest[]): Promise<OracleResponse[]> {
    await ensureProc();

    // Send all requests
    for (const req of reqs) {
        proc!.stdin.write(JSON.stringify(req) + "\n");
    }
    proc!.stdin.flush();

    // Read all responses
    const results: OracleResponse[] = [];
    for (let i = 0; i < reqs.length; i++) {
        const line = await readLine();
        results.push(JSON.parse(line));
    }
    return results;
}

/**
 * Shut down the oracle subprocess.
 */
export function killOracle(): void {
    if (reader) {
        reader.releaseLock();
        reader = null;
    }
    if (proc && !proc.killed) {
        proc.stdin.end();
        proc.kill();
        proc = null;
    }
}

/**
 * Compare two flat number arrays element-wise within a tolerance.
 */
export function assertClose(
    actual: number[],
    expected: number[],
    tol: number = 1e-10,
    label: string = ""
): void {
    if (actual.length !== expected.length) {
        throw new Error(
            `${label}Length mismatch: actual ${actual.length} vs expected ${expected.length}`
        );
    }
    for (let i = 0; i < actual.length; i++) {
        const diff = Math.abs(actual[i] - expected[i]);
        const denom = Math.max(1, Math.abs(expected[i]));
        if (diff / denom > tol) {
            throw new Error(
                `${label}[${i}]: actual ${actual[i]} vs expected ${expected[i]} (diff ${diff}, rel ${diff / denom})`
            );
        }
    }
}

/**
 * Compare two 2D number arrays element-wise within a tolerance.
 */
export function assertClose2D(
    actual: number[][],
    expected: number[][],
    tol: number = 1e-10,
    label: string = ""
): void {
    if (actual.length !== expected.length) {
        throw new Error(
            `${label}Row count mismatch: actual ${actual.length} vs expected ${expected.length}`
        );
    }
    for (let i = 0; i < actual.length; i++) {
        assertClose(actual[i], expected[i], tol, `${label}row ${i} `);
    }
}

/**
 * Compare two scalars within a tolerance.
 */
export function assertScalarClose(
    actual: number,
    expected: number,
    tol: number = 1e-10,
    label: string = ""
): void {
    const diff = Math.abs(actual - expected);
    const denom = Math.max(1, Math.abs(expected));
    if (diff / denom > tol) {
        throw new Error(
            `${label}actual ${actual} vs expected ${expected} (diff ${diff}, rel ${diff / denom})`
        );
    }
}
