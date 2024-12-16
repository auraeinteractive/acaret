#ifndef OOP_UTILS_H
#define OOP_UTILS_H

#include <stdlib.h>
#include <string.h>

// String duplication helper (if strdup is unavailable)
char *ml_strdup(const char *str) {
    char *copy = (char *)malloc(strlen(str) + 1);
    if (copy) strcpy(copy, str);
    return copy;
}

#endif // OOP_UTILS_H

