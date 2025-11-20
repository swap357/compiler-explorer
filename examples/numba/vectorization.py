import numba
import numpy as np


@numba.njit
def vector_add(a, b):
    """Simple vectorized addition"""
    result = np.empty_like(a)
    for i in range(len(a)):
        result[i] = a[i] + b[i]
    return result


@numba.njit
def dot_product(a, b):
    """Compute dot product of two vectors"""
    total = 0.0
    for i in range(len(a)):
        total += a[i] * b[i]
    return total


@numba.njit
def matrix_multiply(A, B):
    """Matrix multiplication with explicit loops"""
    m, n = A.shape
    n2, p = B.shape
    C = np.zeros((m, p))
    for i in range(m):
        for j in range(p):
            for k in range(n):
                C[i, j] += A[i, k] * B[k, j]
    return C


# Trigger compilation by calling functions with sample data
if __name__ != "__main__":
    _a = np.array([1.0, 2.0])
    _b = np.array([3.0, 4.0])
    vector_add(_a, _b)
    dot_product(_a, _b)
    _m = np.array([[1.0, 2.0], [3.0, 4.0]])
    matrix_multiply(_m, _m)
