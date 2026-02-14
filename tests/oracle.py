"""
NumPy oracle for cross-language validation of numeric-2.

Reads NDJSON requests on stdin, computes results with NumPy, writes NDJSON responses on stdout.

Request formats:
  {"op": "sqrt", "seed": 42, "n": 100}                          # unary map
  {"op": "add", "variant": "VV", "seed": 42, "n": 100}          # binary op VV
  {"op": "add", "variant": "VS", "seed": 42, "n": 100}          # binary op VS
  {"op": "add", "variant": "SV", "seed": 42, "n": 100}          # binary op SV
  {"op": "sum", "seed": 42, "n": 100}                           # reducer
  {"op": "dot", "variant": "VV", "seed": 42, "n": 100}          # dot VV
  {"op": "dot", "variant": "MV", "seed": 42, "m": 4, "n": 4}    # dot MV
  {"op": "dot", "variant": "VM", "seed": 42, "m": 4, "n": 4}    # dot VM
  {"op": "dot", "variant": "MM", "seed": 42, "m": 4, "n": 4, "p": 4}  # dot MM
  {"op": "solve", "seed": 42, "n": 5}                           # linear solve
  {"op": "inv", "seed": 42, "n": 5}                             # matrix inverse
  {"op": "det", "seed": 42, "n": 5}                             # determinant
  {"op": "cx_neg", "seed": 42, "n": 100}                        # complex unary
  {"op": "cx_add", "variant": "VV", "seed": 42, "n": 100}       # complex binary
  {"op": "cx_norm2", "seed": 42, "n": 100}                      # complex reducer
  {"op": "getBlock", "seed": 42, "m": 8, "n": 6, "r0": 1, "c0": 2, "r1": 5, "c1": 5}  # submatrix
  {"op": "getBlock1D", "seed": 42, "n": 20, "from": 3, "to": 12}                       # subvector
  {"op": "cx_dot_VV", "seed": 42, "n": 10}                      # complex dot product

Response format:
  {"inputs": {...}, "expected": ...}
"""

import json
import sys
import numpy as np

UNARY_OPS = {
    "sqrt": lambda x: np.sqrt(np.abs(x)),  # ensure non-negative input for sqrt
    "abs": np.abs,
    "exp": np.exp,
    "log": lambda x: np.log(np.abs(x) + 1e-15),  # ensure positive input for log
    "sin": np.sin,
    "cos": np.cos,
    "tan": np.tan,
    "asin": lambda x: np.arcsin(np.clip(x, -1, 1)),  # clamp to valid domain
    "acos": lambda x: np.arccos(np.clip(x, -1, 1)),  # clamp to valid domain
    "atan": np.arctan,
    "neg": np.negative,
    "ceil": np.ceil,
    "floor": np.floor,
    "round": np.round,
}

BINARY_OPS = {
    "add": np.add,
    "sub": np.subtract,
    "mul": np.multiply,
    "div": np.divide,
    "mod": np.fmod,  # JS % uses truncated division, matching np.fmod not np.mod
    "pow": lambda x, y: np.power(np.abs(x), y),  # ensure non-negative base
}

REDUCERS = {
    "sum": np.sum,
    "prod": np.prod,
    "max": np.max,
    "min": np.min,
    "norm1": lambda x: np.sum(np.abs(x)),
    "norm2": np.linalg.norm,
    "norm2squared": lambda x: float(np.dot(x, x)),
    "normInf": lambda x: np.max(np.abs(x)),
}


def handle_unary(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    op = req["op"]

    if op == "sqrt":
        x = np.abs(rng.standard_normal(n)) + 0.01
    elif op == "log":
        x = np.abs(rng.standard_normal(n)) + 0.01
    elif op in ("asin", "acos"):
        x = rng.uniform(-0.99, 0.99, n)
    else:
        x = rng.standard_normal(n)

    fn = UNARY_OPS[op]
    result = fn(x)
    return {"inputs": {"x": x.tolist()}, "expected": result.tolist()}


def handle_binary(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    op = req["op"]
    variant = req["variant"]

    x_arr = rng.standard_normal(n)
    y_arr = rng.standard_normal(n)
    scalar = float(rng.standard_normal())

    if op == "div":
        # avoid division by zero
        y_arr = np.where(np.abs(y_arr) < 1e-10, 1.0, y_arr)
        if abs(scalar) < 1e-10:
            scalar = 1.0
    elif op == "mod":
        y_arr = np.where(np.abs(y_arr) < 0.1, 1.0, y_arr)
        if abs(scalar) < 0.1:
            scalar = 1.0
    elif op == "pow":
        x_arr = np.abs(x_arr) + 0.01
        y_arr = rng.uniform(0.1, 3.0, n)
        scalar = abs(scalar) + 0.1

    fn = BINARY_OPS[op]

    if variant == "VV":
        result = fn(x_arr, y_arr)
        return {"inputs": {"x": x_arr.tolist(), "y": y_arr.tolist()}, "expected": result.tolist()}
    elif variant == "VS":
        result = fn(x_arr, scalar)
        return {"inputs": {"x": x_arr.tolist(), "y": scalar}, "expected": result.tolist()}
    elif variant == "SV":
        result = fn(scalar, y_arr)
        return {"inputs": {"x": scalar, "y": y_arr.tolist()}, "expected": result.tolist()}
    else:
        raise ValueError(f"Unknown variant: {variant}")


def handle_reducer(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    op = req["op"]

    x = rng.standard_normal(n)
    fn = REDUCERS[op]
    result = fn(x)
    return {"inputs": {"x": x.tolist()}, "expected": float(result)}


def handle_dot(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    variant = req["variant"]

    if variant == "VV":
        n = req["n"]
        x = rng.standard_normal(n)
        y = rng.standard_normal(n)
        result = float(np.dot(x, y))
        return {"inputs": {"x": x.tolist(), "y": y.tolist()}, "expected": result}
    elif variant == "MV":
        m, n = req["m"], req["n"]
        A = rng.standard_normal((m, n))
        v = rng.standard_normal(n)
        result = A @ v
        return {"inputs": {"A": A.tolist(), "v": v.tolist()}, "expected": result.tolist()}
    elif variant == "VM":
        m, n = req["m"], req["n"]
        v = rng.standard_normal(m)
        A = rng.standard_normal((m, n))
        result = v @ A
        return {"inputs": {"v": v.tolist(), "A": A.tolist()}, "expected": result.tolist()}
    elif variant == "MM":
        m, n, p = req["m"], req["n"], req["p"]
        A = rng.standard_normal((m, n))
        B = rng.standard_normal((n, p))
        result = A @ B
        return {"inputs": {"A": A.tolist(), "B": B.tolist()}, "expected": result.tolist()}
    else:
        raise ValueError(f"Unknown dot variant: {variant}")


def handle_solve(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    # generate a well-conditioned matrix
    A = rng.standard_normal((n, n))
    A += n * np.eye(n)  # make diagonally dominant
    b = rng.standard_normal(n)
    x = np.linalg.solve(A, b)
    return {"inputs": {"A": A.tolist(), "b": b.tolist()}, "expected": x.tolist()}


def handle_inv(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    A = rng.standard_normal((n, n))
    A += n * np.eye(n)
    result = np.linalg.inv(A)
    return {"inputs": {"A": A.tolist()}, "expected": result.tolist()}


def handle_det(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    A = rng.standard_normal((n, n))
    A += n * np.eye(n)
    result = float(np.linalg.det(A))
    return {"inputs": {"A": A.tolist()}, "expected": result}


CX_UNARY_OPS = {
    "cx_neg": np.negative,
    "cx_conj": np.conj,
    "cx_abs": np.abs,
    "cx_clone": lambda x: x.copy(),
}

CX_BINARY_OPS = {
    "cx_add": np.add,
    "cx_sub": np.subtract,
    "cx_mul": np.multiply,
    "cx_div": np.divide,
}

CX_REDUCERS = {
    "cx_norm2": np.linalg.norm,
    "cx_norm2squared": lambda x: float(np.sum(np.abs(x)**2)),
    "cx_norm1": lambda x: float(np.sum(np.abs(x))),
}


def cx_to_parts(z):
    """Convert complex array/scalar to {re, im} dict."""
    if np.isscalar(z):
        return {"re": float(np.real(z)), "im": float(np.imag(z))}
    return {"re": np.real(z).tolist(), "im": np.imag(z).tolist()}


def handle_cx_unary(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    op = req["op"]

    x = rng.standard_normal(n) + 1j * rng.standard_normal(n)
    fn = CX_UNARY_OPS[op]
    result = fn(x)
    return {"inputs": {"x": cx_to_parts(x)}, "expected": cx_to_parts(result)}


def handle_cx_binary(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    op = req["op"]
    variant = req["variant"]

    x_arr = rng.standard_normal(n) + 1j * rng.standard_normal(n)
    y_arr = rng.standard_normal(n) + 1j * rng.standard_normal(n)
    scalar = complex(rng.standard_normal(), rng.standard_normal())

    if op == "cx_div":
        # avoid division by zero
        y_arr = np.where(np.abs(y_arr) < 1e-10, 1.0 + 0j, y_arr)
        if abs(scalar) < 1e-10:
            scalar = 1.0 + 0j

    fn = CX_BINARY_OPS[op]

    if variant == "VV":
        result = fn(x_arr, y_arr)
        return {"inputs": {"x": cx_to_parts(x_arr), "y": cx_to_parts(y_arr)}, "expected": cx_to_parts(result)}
    elif variant == "VS":
        result = fn(x_arr, scalar)
        return {"inputs": {"x": cx_to_parts(x_arr), "y": cx_to_parts(scalar)}, "expected": cx_to_parts(result)}
    elif variant == "SV":
        result = fn(scalar, y_arr)
        return {"inputs": {"x": cx_to_parts(scalar), "y": cx_to_parts(y_arr)}, "expected": cx_to_parts(result)}
    else:
        raise ValueError(f"Unknown variant: {variant}")


def handle_cx_reducer(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    op = req["op"]

    x = rng.standard_normal(n) + 1j * rng.standard_normal(n)
    fn = CX_REDUCERS[op]
    result = fn(x)
    return {"inputs": {"x": cx_to_parts(x)}, "expected": float(result)}


def handle_getBlock(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    m, n = req["m"], req["n"]
    r0, c0, r1, c1 = req["r0"], req["c0"], req["r1"], req["c1"]
    A = rng.standard_normal((m, n))
    result = A[r0:r1, c0:c1]
    return {"inputs": {"A": A.tolist()}, "expected": result.tolist()}


def handle_getBlock1D(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    fr, to = req["from"], req["to"]
    x = rng.standard_normal(n)
    result = x[fr:to]
    return {"inputs": {"x": x.tolist()}, "expected": result.tolist()}


def handle_cx_dot_VV(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    x = rng.standard_normal(n) + 1j * rng.standard_normal(n)
    y = rng.standard_normal(n) + 1j * rng.standard_normal(n)
    # unconjugated dot: sum(x_i * y_i), not the Hermitian inner product
    result = complex(np.sum(x * y))
    return {
        "inputs": {"x": cx_to_parts(x), "y": cx_to_parts(y)},
        "expected": {"re": float(result.real), "im": float(result.imag)},
    }


def handle_cx_eig(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    A = rng.standard_normal((n, n)) + 1j * rng.standard_normal((n, n))
    eigenvalues = np.linalg.eigvals(A)
    # Sort eigenvalues lexicographically (real part, then imaginary part) for stable comparison
    idx = np.lexsort((eigenvalues.imag, eigenvalues.real))
    eigenvalues = eigenvalues[idx]
    trace_val = complex(np.trace(A))
    det_val = complex(np.linalg.det(A))
    return {
        "inputs": {"A": cx_to_parts(A)},
        "expected": {
            "eigenvalues": cx_to_parts(eigenvalues),
            "trace": {"re": float(trace_val.real), "im": float(trace_val.imag)},
            "det": {"re": float(det_val.real), "im": float(det_val.imag)},
        }
    }


def handle_eig(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    A = rng.standard_normal((n, n))
    eigenvalues = np.linalg.eigvals(A)
    # Sort eigenvalues lexicographically (real part, then imaginary part) for stable comparison
    idx = np.lexsort((eigenvalues.imag, eigenvalues.real))
    eigenvalues = eigenvalues[idx]
    return {
        "inputs": {"A": A.tolist()},
        "expected": {
            "eigenvalues": cx_to_parts(eigenvalues),
            "trace": float(np.trace(A)),
            "det": float(np.real(np.linalg.det(A))),
        }
    }


def process(req: dict) -> dict:
    op = req["op"]

    if op in UNARY_OPS:
        return handle_unary(req)
    elif op in BINARY_OPS:
        return handle_binary(req)
    elif op in REDUCERS:
        return handle_reducer(req)
    elif op == "dot":
        return handle_dot(req)
    elif op == "solve":
        return handle_solve(req)
    elif op == "inv":
        return handle_inv(req)
    elif op == "det":
        return handle_det(req)
    elif op in CX_UNARY_OPS:
        return handle_cx_unary(req)
    elif op in CX_BINARY_OPS:
        return handle_cx_binary(req)
    elif op in CX_REDUCERS:
        return handle_cx_reducer(req)
    elif op == "getBlock":
        return handle_getBlock(req)
    elif op == "getBlock1D":
        return handle_getBlock1D(req)
    elif op == "cx_dot_VV":
        return handle_cx_dot_VV(req)
    elif op == "eig":
        return handle_eig(req)
    elif op == "cx_eig":
        return handle_cx_eig(req)
    else:
        raise ValueError(f"Unknown op: {op}")


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req = json.loads(line)
        resp = process(req)
        print(json.dumps(resp), flush=True)


if __name__ == "__main__":
    main()
