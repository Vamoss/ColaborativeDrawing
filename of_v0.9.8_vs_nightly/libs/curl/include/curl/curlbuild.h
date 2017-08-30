/* The size of long, as computed by sizeof. */
#if defined(__LP64__) || defined(_WIN64)
#include "curl/curlbuild64.h"
#else
#include "curl/curlbuild32.h"
#endif
