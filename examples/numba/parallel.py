import numba


@numba.njit(parallel=True)
def parallel_sum(arr):
    """Parallel reduction using prange"""
    total = 0.0
    for i in numba.prange(len(arr)):
        total += arr[i]
    return total


@numba.njit(parallel=True)
def parallel_normalize(arr):
    """Parallel normalization of array"""
    # Find maximum
    max_val = arr[0]
    for i in numba.prange(1, len(arr)):
        if arr[i] > max_val:
            max_val = arr[i]
    
    # Normalize
    result = arr.copy()
    for i in numba.prange(len(arr)):
        result[i] = arr[i] / max_val
    
    return result


@numba.njit(parallel=True)
def monte_carlo_pi(n_samples):
    """Estimate pi using Monte Carlo method with parallel execution"""
    inside = 0
    for i in numba.prange(n_samples):
        x = (i * 0.618033988749895) % 1.0  # Pseudo-random using golden ratio
        y = (i * 0.324717957244746) % 1.0
        if x * x + y * y <= 1.0:
            inside += 1
    return 4.0 * inside / n_samples
