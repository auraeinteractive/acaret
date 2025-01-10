#ifndef _SESSION_H_
#define _SESSION_H_

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

void sessionInit();
char* readFromSession( const char *key );
void writeToSession( const char *key, const char *value );

#endif