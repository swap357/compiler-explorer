import numba


@numba.njit
def fibonacci(n):
    """Compute nth Fibonacci number"""
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b


@numba.njit
def binary_search(arr, target):
    """Binary search in sorted array"""
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1


@numba.njit
def quicksort_partition(arr, low, high):
    """Partition helper for quicksort"""
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1


@numba.njit
def moving_average(data, window_size):
    """Compute moving average with given window size"""
    n = len(data)
    result = data.copy()
    for i in range(window_size, n):
        total = 0.0
        for j in range(i - window_size, i):
            total += data[j]
        result[i] = total / window_size
    return result
