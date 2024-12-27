#include "util.h"

// String duplication helper (if strdup is unavailable)
char *ml_strdup(const char *str) {
    char *copy = (char *)malloc(strlen(str) + 1);
    if (copy) strcpy(copy, str);
    return copy;
}


