#include "proxy.h"
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <fcntl.h> 

#define PORT 11434
#define PROXYPORT 8089

static pthread_t proxyThread;
static int running = 1;

// Timeout in seconds for backend response
#define RESPONSE_TIMEOUT 5

void* proxyThreadFunction(void* arg) {
    // Initialize OpenSSL
    SSL_library_init();
    SSL_load_error_strings();
    OpenSSL_add_ssl_algorithms();

    // Create SSL context for the proxy (for HTTPS connections)
    const SSL_METHOD* method = TLS_server_method();
    SSL_CTX* ctx = SSL_CTX_new(method);
    if (!ctx) {
        perror("Unable to create SSL context");
        ERR_print_errors_fp(stderr);
        return NULL;
    }

    // Load SSL certificate and private key for the proxy
    if (SSL_CTX_use_certificate_file(ctx, "config/cert.pem", SSL_FILETYPE_PEM) <= 0 ||
        SSL_CTX_use_PrivateKey_file(ctx, "config/key.pem", SSL_FILETYPE_PEM) <= 0) {
        ERR_print_errors_fp(stderr);
        SSL_CTX_free(ctx);
        return NULL;
    }

    // Disable certificate verification
    SSL_CTX_set_verify(ctx, SSL_VERIFY_NONE, NULL);

    // Create server socket for the proxy (HTTPS server)
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("Socket creation failed");
        SSL_CTX_free(ctx);
        return NULL;
    }

    // Configure socket address
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(PROXYPORT);
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

    // Bind socket
    if (bind(server_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("Bind failed");
        close(server_fd);
        SSL_CTX_free(ctx);
        return NULL;
    }

    // Start listening for incoming client connections
    if (listen(server_fd, 10) < 0) {
        perror("Listen failed");
        close(server_fd);
        SSL_CTX_free(ctx);
        return NULL;
    }

    printf("Proxy server running on https://localhost:%d (forwarding to http://localhost:%d)\n", PROXYPORT, PORT);

    while (running) {
        struct sockaddr_in client_addr;
        socklen_t client_len = sizeof(client_addr);
        int client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
        if (client_fd < 0) {
            if (running) {
                perror("Accept failed");
            }
            break;
        }
        printf("Accepted connection from client\n");

        // Create new SSL session for the client
        SSL* ssl = SSL_new(ctx);
        SSL_set_fd(ssl, client_fd);

        // Perform SSL handshake with the client (HTTPS)
        if (SSL_accept(ssl) <= 0) {
            ERR_print_errors_fp(stderr);
            SSL_free(ssl);
            close(client_fd);
            continue;
        }
        printf("SSL handshake completed with client\n");

        // Read HTTPS request from the client
        char buffer[4096] = {0};
        int bytes = SSL_read(ssl, buffer, sizeof(buffer));
        if (bytes <= 0) {
            if (bytes < 0) {
                ERR_print_errors_fp(stderr);
            } else {
                printf("Client closed connection\n");
            }
            SSL_free(ssl);
            close(client_fd);
            continue;
        }
        printf("Received HTTPS request from client\n");

        // Create socket for backend HTTP server (no SSL needed)
        int http_fd = socket(AF_INET, SOCK_STREAM, 0);
        if (http_fd < 0) {
            perror("Failed to create socket to backend");
            SSL_free(ssl);
            close(client_fd);
            continue;
        }
        printf("Created socket to backend HTTP server\n");

        // Connect to the backend HTTP server (non-SSL connection)
        struct sockaddr_in backend_addr;
        memset(&backend_addr, 0, sizeof(backend_addr));
        backend_addr.sin_family = AF_INET;
        backend_addr.sin_port = htons(PORT);  // Backend HTTP port (not HTTPS)
        backend_addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

        if (connect(http_fd, (struct sockaddr*)&backend_addr, sizeof(backend_addr)) < 0) {
            perror("Failed to connect to backend");
            close(http_fd);
            SSL_free(ssl);
            close(client_fd);
            continue;
        }
        printf("Connected to backend HTTP server\n");

        // Forward the client's HTTP request to the backend HTTP server
        if (send(http_fd, buffer, bytes, 0) < 0) {
            perror("Failed to send request to backend server");
            close(http_fd);
            SSL_free(ssl);
            close(client_fd);
            continue;
        }

        // Set up a timeout for receiving data from the backend
        struct timeval tv;
        tv.tv_sec = RESPONSE_TIMEOUT; // 10 seconds timeout, adjust as necessary
        tv.tv_usec = 0;
        setsockopt(http_fd, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof(tv));

        // Use select() to wait for data on the backend socket
        fd_set readfds;
        FD_ZERO(&readfds);
        FD_SET(http_fd, &readfds);

        int ret = select(http_fd + 1, &readfds, NULL, NULL, &tv);
        if (ret <= 0) {
            if (ret == 0) {
                printf("Timeout waiting for response from backend\n");
            } else {
                perror("Error with select()");
            }
            close(http_fd);
            SSL_free(ssl);
            close(client_fd);
            continue;
        }

        // Now read from the backend (only if data is ready)
        if (FD_ISSET(http_fd, &readfds)) {
            bytes = recv(http_fd, buffer, sizeof(buffer), 0);
            if (bytes < 0) {
                perror("Error reading from backend server");
            } else if (bytes == 0) {
                printf("Backend server closed the connection\n");
            } else {
                if (SSL_write(ssl, buffer, bytes) <= 0) {
                    ERR_print_errors_fp(stderr);
                }
            }
        }

        // Cleanup backend HTTP connection
        close(http_fd);

        // Cleanup client SSL connection
        SSL_free(ssl);
        close(client_fd);
        printf("Connection closed for client\n");
    }

    // Cleanup resources
    close(server_fd);
    SSL_CTX_free(ctx);

    // Cleanup OpenSSL
    EVP_cleanup();
    ERR_free_strings();
    CRYPTO_cleanup_all_ex_data();
    return NULL;
}

unsigned int startProxyServer() {
    running = 1;
    if (pthread_create(&proxyThread, NULL, proxyThreadFunction, NULL) != 0) {
        perror("Failed to create proxy thread");
        return 1;
    }
    return 0;
}

void stopProxyServer() {
    running = 0;
    pthread_join(proxyThread, NULL);
    printf("Proxy server stopped.\n");
}

