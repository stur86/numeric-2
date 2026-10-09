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
    "atan2": np.arctan2,
    "max": np.maximum,
    "min": np.minimum,
    "eq": np.equal,
    "neq": np.not_equal,
    "lt": np.less,
    "gt": np.greater,
    "leq": np.less_equal,
    "geq": np.greater_equal,
}

REDUCERS = {
    "sum": np.sum,
    "prod": np.prod,
    "max": np.max,
    "min": np.min,
    "norm1": lambda x: np.sum(np.abs(x)),
    "norm2": lambda x: np.sqrt(np.sum(x * x)),  # element-wise (Frobenius for matrices)
    "norm2squared": lambda x: float(np.sum(x * x)),
    "normInf": lambda x: np.max(np.abs(x)),
}


def size(req: dict):
    """Element-wise ops take either a length "n" or a matrix "shape" [m, n]."""
    return tuple(req["shape"]) if "shape" in req else req["n"]


def handle_unary(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = size(req)
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
    n = size(req)
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
    n = size(req)
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
    "cx_exp": np.exp,
    "cx_log": np.log,
    "cx_sqrt": np.sqrt,
    "cx_sin": np.sin,
    "cx_cos": np.cos,
}

# Complex reducers with a complex result
CX_CX_REDUCERS = {
    "cx_sum": np.sum,
    "cx_prod": np.prod,
}

CX_COMPARISONS = ("cx_eq", "cx_neq")

CX_BINARY_OPS = {
    "cx_add": np.add,
    "cx_sub": np.subtract,
    "cx_mul": np.multiply,
    "cx_div": np.divide,
    "cx_eq": np.equal,
    "cx_neq": np.not_equal,
}

CX_REDUCERS = {
    "cx_norm2": lambda x: float(np.sqrt(np.sum(np.abs(x)**2))),
    "cx_norm2squared": lambda x: float(np.sum(np.abs(x)**2)),
    "cx_norm1": lambda x: float(np.sum(np.abs(x))),
    "cx_normInf": lambda x: float(np.max(np.abs(x))),
}


def cx_to_parts(z):
    """Convert complex array/scalar to {re, im} dict."""
    if np.isscalar(z):
        return {"re": float(np.real(z)), "im": float(np.imag(z))}
    return {"re": np.real(z).tolist(), "im": np.imag(z).tolist()}


def handle_cx_unary(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = size(req)
    op = req["op"]

    x = rng.standard_normal(n) + 1j * rng.standard_normal(n)
    fn = CX_UNARY_OPS[op]
    result = fn(x)
    return {"inputs": {"x": cx_to_parts(x)}, "expected": cx_to_parts(result)}


def handle_cx_binary(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = size(req)
    op = req["op"]
    variant = req["variant"]

    x_arr = rng.standard_normal(n) + 1j * rng.standard_normal(n)
    y_arr = rng.standard_normal(n) + 1j * rng.standard_normal(n)
    scalar = complex(rng.standard_normal(), rng.standard_normal())
    # Optionally make one operand purely real (mixed real/complex VV)
    if req.get("real_x"):
        x_arr = x_arr.real + 0j
    if req.get("real_y"):
        y_arr = y_arr.real + 0j

    if op in CX_COMPARISONS:
        # make some elements (and the scalar) equal, so both outcomes occur
        y_arr.reshape(-1)[::2] = x_arr.reshape(-1)[::2]
        scalar = complex(x_arr.reshape(-1)[0])

    if op == "cx_div":
        # avoid division by zero
        y_arr = np.where(np.abs(y_arr) < 1e-10, 1.0 + 0j, y_arr)
        if abs(scalar) < 1e-10:
            scalar = 1.0 + 0j

    fn = CX_BINARY_OPS[op]
    out = (lambda r: r.tolist()) if op in CX_COMPARISONS else cx_to_parts

    if variant == "VV":
        result = fn(x_arr, y_arr)
        return {"inputs": {"x": cx_to_parts(x_arr), "y": cx_to_parts(y_arr)}, "expected": out(result)}
    elif variant == "VS":
        result = fn(x_arr, scalar)
        return {"inputs": {"x": cx_to_parts(x_arr), "y": cx_to_parts(scalar)}, "expected": out(result)}
    elif variant == "SV":
        result = fn(scalar, y_arr)
        return {"inputs": {"x": cx_to_parts(scalar), "y": cx_to_parts(y_arr)}, "expected": out(result)}
    else:
        raise ValueError(f"Unknown variant: {variant}")


def handle_cx_reducer(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = size(req)
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


def handle_cx_cx_reducer(req: dict) -> dict:
    rng = np.random.default_rng(req["seed"])
    n = size(req)
    x = rng.standard_normal(n) + 1j * rng.standard_normal(n)
    result = complex(CX_CX_REDUCERS[req["op"]](x))
    return {"inputs": {"x": cx_to_parts(x)}, "expected": cx_to_parts(result)}


def cx_random(rng, shape, real: bool):
    """Random complex array, or a real one (as complex dtype) if real=True."""
    z = rng.standard_normal(shape) + 1j * rng.standard_normal(shape)
    return z.real + 0j if real else z


def handle_cx_linalg(req: dict) -> dict:
    """cx_solve / cx_inv / cx_det on a well-conditioned complex matrix.
    real_A / real_b make that input purely real (mixed real/complex cases)."""
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    op = req["op"]
    A = cx_random(rng, (n, n), req.get("real_A", False)) + n * np.eye(n)
    if op == "cx_solve":
        b = cx_random(rng, n, req.get("real_b", False))
        return {"inputs": {"A": cx_to_parts(A), "b": cx_to_parts(b)}, "expected": cx_to_parts(np.linalg.solve(A, b))}
    if op == "cx_inv":
        return {"inputs": {"A": cx_to_parts(A)}, "expected": cx_to_parts(np.linalg.inv(A))}
    if op == "cx_det":
        return {"inputs": {"A": cx_to_parts(A)}, "expected": cx_to_parts(complex(np.linalg.det(A)))}
    raise ValueError(f"Unknown op: {op}")


def handle_cx_dot(req: dict) -> dict:
    """Complex dot MV / VM / MM (unconjugated). real_x / real_y make one side real."""
    rng = np.random.default_rng(req["seed"])
    m, n, p = req["m"], req["n"], req.get("p", 1)
    shapes = {"MV": ((m, n), n), "VM": (m, (m, n)), "MM": ((m, n), (n, p))}[req["variant"]]
    x = cx_random(rng, shapes[0], req.get("real_x", False))
    y = cx_random(rng, shapes[1], req.get("real_y", False))
    return {"inputs": {"x": cx_to_parts(x), "y": cx_to_parts(y)}, "expected": cx_to_parts(np.dot(x, y))}


def handle_svd(req: dict) -> dict:
    """Random m×n matrix (optionally of a given rank) and its singular values."""
    rng = np.random.default_rng(req["seed"])
    m, n = req["m"], req["n"]
    rank = req.get("rank")
    if rank is None:
        A = rng.standard_normal((m, n))
    else:
        A = rng.standard_normal((m, rank)) @ rng.standard_normal((rank, n))
    return {"inputs": {"A": A.tolist()}, "expected": np.linalg.svd(A, compute_uv=False).tolist()}


def handle_fft(req: dict) -> dict:
    """fft / ifft of a random signal (real if req["real"])."""
    rng = np.random.default_rng(req["seed"])
    n = req["n"]
    x = rng.standard_normal(n)
    if not req.get("real"):
        x = x + 1j * rng.standard_normal(n)
    fn = np.fft.fft if req["op"] == "fft" else np.fft.ifft
    return {"inputs": {"x": cx_to_parts(x + 0j)}, "expected": cx_to_parts(fn(x))}


def handle_lp(req: dict) -> dict:
    """Random bounded LP: minimize c·x s.t. A x <= b (with box bounds as rows), optional Aeq x = beq."""
    from scipy.optimize import linprog
    rng = np.random.default_rng(req["seed"])
    n, m = req["n"], req["m"]
    A = rng.standard_normal((m, n))
    x_feas = rng.uniform(-1, 1, n)
    b = A @ x_feas + rng.uniform(0.1, 1.0, m)       # x_feas is strictly feasible
    box = 5.0
    A_full = np.vstack([A, np.eye(n), -np.eye(n)])  # |x_i| <= box keeps the LP bounded
    b_full = np.concatenate([b, np.full(n, box), np.full(n, box)])
    c = rng.standard_normal(n)
    kw = {}
    out = {"c": c.tolist(), "A": A_full.tolist(), "b": b_full.tolist()}
    if req.get("meq"):
        Aeq = rng.standard_normal((req["meq"], n))
        beq = Aeq @ x_feas
        kw = {"A_eq": Aeq, "b_eq": beq}
        out.update({"Aeq": Aeq.tolist(), "beq": beq.tolist()})
    res = linprog(c, A_ub=A_full, b_ub=b_full, bounds=[(None, None)] * n, method="highs", **kw)
    return {"inputs": out, "expected": {"x": res.x.tolist(), "fun": float(res.fun)}}


def handle_qp(req: dict) -> dict:
    """Random strictly convex QP: minimize ½xᵀDx − dᵀx s.t. Aᵀx >= b (first meq equalities)."""
    from scipy.optimize import minimize
    rng = np.random.default_rng(req["seed"])
    n, q, meq = req["n"], req["q"], req.get("meq", 0)
    M = rng.standard_normal((n, n))
    D = M @ M.T + n * np.eye(n)
    d = rng.standard_normal(n) * 5
    A = rng.standard_normal((n, q))
    x_feas = rng.standard_normal(n)
    b = A.T @ x_feas - np.concatenate([np.zeros(meq), rng.uniform(0.1, 1.0, q - meq)])
    cons = [{"type": "eq" if i < meq else "ineq", "fun": (lambda x, i=i: A[:, i] @ x - b[i]), "jac": (lambda x, i=i: A[:, i])}
            for i in range(q)]
    obj = lambda x: 0.5 * x @ D @ x - d @ x
    res = minimize(obj, x_feas, jac=lambda x: D @ x - d, constraints=cons, method="SLSQP",
                   options={"ftol": 1e-15, "maxiter": 1000})
    return {"inputs": {"D": D.tolist(), "d": d.tolist(), "A": A.tolist(), "b": b.tolist()},
            "expected": {"x": res.x.tolist(), "fun": float(res.fun)}}


def handle_spline(req: dict) -> dict:
    """scipy CubicSpline for random knots; bc is "natural", "periodic", "clamped" or "mixed"."""
    from scipy.interpolate import CubicSpline
    rng = np.random.default_rng(req["seed"])
    n, dim, bc = req["n"], req.get("dim"), req["bc"]
    x = np.cumsum(rng.uniform(0.2, 1.5, n)) - 1.0
    y = rng.standard_normal((n, dim)) if dim else rng.standard_normal(n)
    left = right = None
    if bc == "periodic":
        y[-1] = y[0]
        bc_type = "periodic"
    elif bc == "natural":
        bc_type = "natural"
    else:
        left = rng.standard_normal(dim) if dim else float(rng.standard_normal())
        right = rng.standard_normal(dim) if dim else float(rng.standard_normal())
        if bc == "mixed":
            right = None
            bc_type = ((1, left), (2, np.zeros(dim) if dim else 0.0))
        else:
            bc_type = ((1, left), (1, right))
    cs = CubicSpline(x, y, bc_type=bc_type)
    ts = np.linspace(x[0] - 0.5, x[-1] + 0.5, 41)
    tolist = lambda v: v.tolist() if hasattr(v, "tolist") else v
    out = {
        "inputs": {"x": x.tolist(), "y": y.tolist(), "ts": ts.tolist(), "left": tolist(left), "right": tolist(right)},
        "expected": {"at": cs(ts).tolist(), "diff": cs(ts, 1).tolist(), "diff2": cs(ts, 2).tolist()},
    }
    if not dim:
        out["expected"]["roots"] = cs.roots(extrapolate=False).tolist()
    return out


ODE_PROBLEMS = {
    # name: (f, y0, x1)
    "lotka_volterra": (lambda t, y: [1.5 * y[0] - y[0] * y[1], -3 * y[1] + y[0] * y[1]], [10.0, 5.0], 10.0),
    "van_der_pol": (lambda t, y: [y[1], (1 - y[0] ** 2) * y[1] - y[0]], [2.0, 0.0], 15.0),
    "pendulum": (lambda t, y: [y[1], -np.sin(y[0])], [2.5, 0.0], 20.0),
}


def handle_ode(req: dict) -> dict:
    """Reference solution from scipy's DOP853 at very tight tolerances."""
    from scipy.integrate import solve_ivp
    f, y0, x1 = ODE_PROBLEMS[req["problem"]]
    ts = np.linspace(0, x1, 57)
    res = solve_ivp(f, (0, x1), y0, method="DOP853", rtol=1e-13, atol=1e-13, dense_output=True)
    return {"inputs": {"y0": y0, "x1": x1, "ts": ts.tolist()}, "expected": res.sol(ts).T.tolist()}


def handle_sparse(req: dict) -> dict:
    """Random sparse matrices (as dense lists) and scipy.sparse results."""
    import scipy.sparse as sp
    rng = np.random.default_rng(req["seed"])
    m, n, p, dens = req["m"], req["n"], req.get("p", 3), req["density"]
    rand = lambda r, c: sp.random(r, c, density=dens, random_state=rng, format="csc", data_rvs=rng.standard_normal)
    A, B, C = rand(m, n), rand(m, n), rand(n, p)
    x = rng.standard_normal(n)
    y = rng.standard_normal(m)
    D = rng.standard_normal((n, p))
    rows = rng.integers(0, m, size=max(1, m // 2)).tolist()
    cols = rng.integers(0, n, size=max(1, n // 2)).tolist()
    exp = {
        "add": (A + B).toarray().tolist(), "sub": (A - B).toarray().tolist(),
        "mul": A.multiply(B).toarray().tolist(), "scale": (2.5 * A).toarray().tolist(),
        "dotSS": (A @ C).toarray().tolist(), "dotSV": (A @ x).tolist(), "dotVS": (y @ A).tolist(),
        "dotSD": (A @ D).tolist(), "T": A.T.toarray().tolist(), "nnzA": int(A.nnz),
        "block": A[rows, :][:, cols].toarray().tolist(),
    }
    inputs = {"A": A.toarray().tolist(), "B": B.toarray().tolist(), "C": C.toarray().tolist(),
              "x": x.tolist(), "y": y.tolist(), "D": D.tolist(), "rows": rows, "cols": cols}
    return {"inputs": inputs, "expected": exp}


def handle_sparse_solve(req: dict) -> dict:
    """Square sparse systems: "random" (plus a dominant diagonal), "permuted"
    (needs row pivoting) or "poisson" (2-D Laplacian on a k×k grid)."""
    import scipy.sparse as sp
    from scipy.sparse.linalg import spsolve
    rng = np.random.default_rng(req["seed"])
    kind, n = req["kind"], req["n"]
    if kind == "poisson":
        k = int(round(np.sqrt(n)))
        T = sp.diags([-1, 2, -1], [-1, 0, 1], shape=(k, k))
        A = (sp.kron(sp.identity(k), T) + sp.kron(T, sp.identity(k))).tocsc()
    else:
        A = sp.random(n, n, density=req.get("density", 0.1), random_state=rng, format="csc", data_rvs=rng.standard_normal)
        A = (A + sp.diags(rng.uniform(1, 2, n) * (3 if kind == "random" else 0.0))).tocsc()
        if kind == "permuted":
            # A row permutation of a nonsingular matrix: zero diagonal entries force pivoting
            M = sp.random(n, n, density=req.get("density", 0.1), random_state=rng, format="csc", data_rvs=rng.standard_normal)
            M = (M + sp.diags(rng.uniform(2, 3, n))).tocsr()
            A = M[rng.permutation(n)].tocsc()
    b = rng.standard_normal(A.shape[0])
    C = A.tocoo()
    # Triplets, not dense: large Poisson systems would be millions of numbers
    inputs = {"n": A.shape[0], "rows": C.row.tolist(), "cols": C.col.tolist(), "vals": C.data.tolist(), "b": b.tolist()}
    return {"inputs": inputs, "expected": spsolve(A, b).tolist()}


def handle_logic(req: dict) -> dict:
    """Logical, bitwise, trunc and reciprocal ops (integers in a, b; floats in x, y; complex z)."""
    rng = np.random.default_rng(req["seed"])
    shape = size(req)
    a = rng.integers(-1000, 1000, shape).astype(np.int32)
    b = rng.integers(-1000, 1000, shape).astype(np.int32)
    k = rng.integers(0, 8, shape).astype(np.int32)        # shift counts
    p = rng.integers(0, 2, shape)                          # 0/1 for logical ops
    q = rng.integers(0, 2, shape)
    x = rng.standard_normal(shape) * 10
    y = rng.uniform(0.3, 2.0, shape) * rng.choice([-1, 1], shape)
    z = rng.standard_normal(shape) + 1j * rng.standard_normal(shape)
    exp = {
        "band": np.bitwise_and(a, b), "bor": np.bitwise_or(a, b), "bxor": np.bitwise_xor(a, b),
        "bnot": np.invert(a), "lshift": np.left_shift(a, k), "rshift": np.right_shift(a, k),
        "rrshift": (a.astype(np.uint32) >> k.astype(np.uint32)).astype(np.float64),
        "and": np.logical_and(p, q), "or": np.logical_or(p, q), "not": np.logical_not(p),
        "trunc": np.round(x / y) * y, "reciprocal": 1 / x,
    }
    out = {k2: v.tolist() for k2, v in exp.items()}
    out["cx_reciprocal"] = cx_to_parts(1 / z)
    inputs = {"a": a.tolist(), "b": b.tolist(), "k": k.tolist(), "p": p.tolist(), "q": q.tolist(),
              "x": x.tolist(), "y": y.tolist(), "z": cx_to_parts(z)}
    return {"inputs": inputs, "expected": out}


def handle_xoshiro(req: dict) -> dict:
    """Reference xoshiro128** (from the published C code) seeded through SplitMix32,
    mirroring numeric-2's RandomGenerator: first raw 32-bit outputs and doubles."""
    M = 0xFFFFFFFF
    def rotl(x, k):
        return ((x << k) | (x >> (32 - k))) & M
    def splitmix32(a):
        state = [a & M]
        def nxt():
            state[0] = (state[0] + 0x9E3779B9) & M
            t = state[0] ^ (state[0] >> 16)
            t = (t * 0x21F0AAAD) & M
            t ^= t >> 15
            t = (t * 0x735A2D97) & M
            return (t ^ (t >> 15)) & M
        return nxt
    seed = req["seed"]
    lo, hi = seed & M, (abs(seed) // 2**32) & M
    sm = splitmix32(lo ^ ((hi * 0x85EBCA6B) & M) ^ (0x5BD1E995 if seed < 0 else 0))
    s = [sm(), sm(), sm(), sm()]
    def next32():
        result = (rotl((s[1] * 5) & M, 7) * 9) & M
        t = (s[1] << 9) & M
        s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3]; s[2] ^= t
        s[3] = rotl(s[3], 11)
        return result
    raw = [next32() for _ in range(20)]
    doubles = [((next32() >> 5) * 67108864 + (next32() >> 6)) / 2**53 for _ in range(20)]
    return {"inputs": {}, "expected": {"raw": raw, "doubles": doubles}}


def handle_convolve(req: dict) -> dict:
    """np.convolve in all three modes, for real or complex inputs of lengths n and m."""
    rng = np.random.default_rng(req["seed"])
    n, m = req["n"], req["m"]
    a, v = rng.standard_normal(n), rng.standard_normal(m)
    if req.get("complex"):
        a = a + 1j * rng.standard_normal(n)
        v = v + 1j * rng.standard_normal(m)
    out = {mode: cx_to_parts(np.convolve(a, v, mode) + 0j) for mode in ("full", "same", "valid")}
    return {"inputs": {"a": cx_to_parts(a + 0j), "v": cx_to_parts(v + 0j)}, "expected": out}


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
    elif op in BINARY_OPS and "variant" in req:  # max/min are also reducers
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
    elif op in CX_CX_REDUCERS:
        return handle_cx_cx_reducer(req)
    elif op in ("cx_solve", "cx_inv", "cx_det"):
        return handle_cx_linalg(req)
    elif op == "cx_dot":
        return handle_cx_dot(req)
    elif op == "svd":
        return handle_svd(req)
    elif op in ("fft", "ifft"):
        return handle_fft(req)
    elif op == "lp":
        return handle_lp(req)
    elif op == "qp":
        return handle_qp(req)
    elif op == "spline":
        return handle_spline(req)
    elif op == "ode":
        return handle_ode(req)
    elif op == "sparse":
        return handle_sparse(req)
    elif op == "logic":
        return handle_logic(req)
    elif op == "xoshiro":
        return handle_xoshiro(req)
    elif op == "convolve":
        return handle_convolve(req)
    elif op == "sparse_solve":
        return handle_sparse_solve(req)
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
        try:
            resp = process(json.loads(line))
        except Exception as e:  # report instead of dying, so later requests still work
            resp = {"error": f"{type(e).__name__}: {e}"}
        print(json.dumps(resp), flush=True)


if __name__ == "__main__":
    main()
