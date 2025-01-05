// proxy.h
#ifndef PROXY_H
#define PROXY_H

#include <stdio.h>
#include <pthread.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <string.h>
#include <dirent.h>
#include <unistd.h>
#include <libgen.h>
#include <stdlib.h>
#include <pthread.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <fcntl.h> 
#include <sys/epoll.h>
#include <sys/select.h>
#include <errno.h>
#include <stdbool.h>

// Function to start the proxy server
unsigned int startProxyServer();

void stopProxyNetwork();

// Function to stop the proxy server
void stopProxyServer();

#endif // PROXY_H

