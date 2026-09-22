# Fixture: Numba 0.61.0, Python 3.12, NUMBA_DEBUG_PRINT_WRAP=translate_bytecode,fixup_args,ir_processing
import numba


@numba.njit('int64(int64)')
def square(x):
    return x * x
