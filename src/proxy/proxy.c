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
#include <sys/epoll.h>
#include <sys/select.h>
#include <errno.h>

#define PORT 11434
#define PROXYPORT 8089

static pthread_t proxyThread;
static int running = 1;

// Timeout in seconds for backend response
#define RESPONSE_TIMEOUT 5

// Structure to pass SSL_CTX and client_fd to the thread
typedef struct {
    SSL_CTX* ctx;
    int client_fd;
} thread_args_t;

// Function to handle a single client connection in a new thread
void* handleClientConnection(void* arg);

// Function to set a socket to non-blocking mode
int setSocketNonBlocking(int sockfd) {
    int flags = fcntl(sockfd, F_GETFL, 0);
    if (flags == -1) {
        perror("fcntl(F_GETFL) failed");
        return -1;
    }
    if (fcntl(sockfd, F_SETFL, flags | O_NONBLOCK) == -1) {
        perror("fcntl(F_SETFL) failed");
        return -1;
    }
    return 0;
}

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

    // Disable certificate verification (NO VERIFICATION AT ALL)
    SSL_CTX_set_verify(ctx, SSL_VERIFY_NONE, NULL);
    SSL_CTX_set_verify_depth(ctx, 0);  // Disable verification depth (i.e., no chain check)
    SSL_CTX_set_cert_verify_callback(ctx, NULL, NULL);  // Disable callback for certificate verification

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

    // Set up epoll for managing multiple connections
    int epoll_fd = epoll_create1(0);
    if (epoll_fd == -1) {
        perror("Epoll creation failed");
        close(server_fd);
        SSL_CTX_free(ctx);
        return NULL;
    }

    // Add the server socket to epoll
    struct epoll_event ev;
    ev.events = EPOLLIN;
    ev.data.fd = server_fd;
    if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, server_fd, &ev) == -1) {
        perror("Epoll control failed");
        close(server_fd);
        SSL_CTX_free(ctx);
        return NULL;
    }

    // Main epoll loop
    while (running) {
        struct epoll_event events[10];  // max 10 connections at once
        printf("Waiting for connections\n");
        int num_events = epoll_wait(epoll_fd, events, 10, -1);
        if (num_events == -1) {
            perror("Epoll wait failed");
            break;
        }
        
        printf("Got events %d\n", num_events);

        // Handle events
        for (int i = 0; i < num_events; i++) {
            if (events[i].data.fd == server_fd) {
                // New connection, accept it
                struct sockaddr_in client_addr;
                socklen_t client_len = sizeof(client_addr);
                int client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
                if (client_fd < 0) {
                    perror("Accept failed");
                    continue;
                }

                // Set client socket to non-blocking mode
                if (setSocketNonBlocking(client_fd) < 0) {
                    close(client_fd);
                    continue;
                }

                // Allocate memory for the thread arguments and pass SSL_CTX and client_fd
                thread_args_t* thread_args = malloc(sizeof(thread_args_t));
                thread_args->ctx = ctx;
                thread_args->client_fd = client_fd;

                // Create a new thread to handle the client
                pthread_t client_thread;
                if (pthread_create(&client_thread, NULL, handleClientConnection, thread_args) != 0) {
                    perror("Thread creation failed");
                    free(thread_args);
                    close(client_fd);
                    continue;
                }

                // Detach the thread so it cleans up after itself
                pthread_detach(client_thread);
            }
        }
    }

    // Cleanup resources
    close(server_fd);
    SSL_CTX_free(ctx);
    EVP_cleanup();
    ERR_free_strings();
    CRYPTO_cleanup_all_ex_data();

    return NULL;
}


// Function to handle each client connection
void* handleClientConnection(void* arg) {
    // Cast the argument back to the thread_args_t struct
    thread_args_t* thread_args = (thread_args_t*)arg;
    SSL_CTX* ctx = thread_args->ctx;
    int client_fd = thread_args->client_fd;

    printf("In handleClientConnection..\n");

    // Free the memory allocated for thread arguments
    free(thread_args);

    // Initialize OpenSSL SSL object
    SSL* ssl = SSL_new(ctx);
    if (!ssl) {
        perror("SSL_new failed");
        close(client_fd);
        return NULL;
    }

    SSL_set_fd(ssl, client_fd);

    // Perform SSL handshake (non-blocking)
    int ssl_err;
    while ((ssl_err = SSL_accept(ssl)) <= 0) {
        int error_code = SSL_get_error(ssl, ssl_err);

        if (error_code == SSL_ERROR_WANT_READ || error_code == SSL_ERROR_WANT_WRITE) {
            // This means we need to wait for more data or space to be written to the socket.
            // Just continue the loop to try again after the socket becomes ready.
            // We can use select or epoll to check if the socket is ready to proceed.
            struct timeval timeout = {0, 500000}; // 0.5 seconds timeout for select
            fd_set readfds, writefds;
            FD_ZERO(&readfds);
            FD_ZERO(&writefds);
            FD_SET(client_fd, &readfds);
            FD_SET(client_fd, &writefds);

            // Wait for the socket to be ready for reading or writing
            if (select(client_fd + 1, &readfds, &writefds, NULL, &timeout) > 0) {
                continue; // Retry the SSL_accept after the socket is ready
            } else {
                // Timeout, no data available
                break;
            }
        }

        // Other errors (e.g., SSL_ERROR_SSL) indicate a failure.
        printf("SSL_accept failed with error code: %d\n", error_code);
        ERR_print_errors_fp(stderr);  // Print detailed SSL errors
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    printf("SSL handshake successful\n");

    // Read data from the client in a loop until successful or an error occurs
    printf("Attempting to read data from client...\n");
    char buffer[4096] = {0};
    int bytes = 0;

    while (1) {
        bytes = SSL_read(ssl, buffer, sizeof(buffer));

        if (bytes > 0) {
            // Successfully read data
            printf("Successfully read %d bytes from client\n", bytes);
            // Optionally, print the data if needed (be cautious with large data)
            printf("Data: %.*s\n", bytes, buffer);
            break;
        } else if (bytes < 0) {
            // SSL error occurred
            int ssl_error = SSL_get_error(ssl, bytes);

            switch (ssl_error) {
                case SSL_ERROR_WANT_READ:
                    // This is expected for non-blocking sockets, so we retry
                    printf("SSL error: Want read (non-blocking mode). Retrying...\n");
                    continue;  // Retry reading
                case SSL_ERROR_WANT_WRITE:
                    printf("SSL error: Want write (non-blocking mode). Retrying...\n");
                    continue;  // Retry writing (if applicable)
                case SSL_ERROR_ZERO_RETURN:
                    // Connection closed gracefully by the client
                    printf("SSL error: Connection closed gracefully by client\n");
                    SSL_free(ssl);
                    close(client_fd);
                    return NULL;
                case SSL_ERROR_SYSCALL:
                    // System call failure, print errno if set
                    printf("SSL error: System call failure\n");
                    if (errno != 0) {
                        printf("System error code: %d\n", errno);
                    }
                    SSL_free(ssl);
                    close(client_fd);
                    return NULL;
                case SSL_ERROR_SSL:
                    // Generic SSL failure, print error
                    printf("SSL error: Generic SSL failure\n");
                    ERR_print_errors_fp(stderr);
                    SSL_free(ssl);
                    close(client_fd);
                    return NULL;
                default:
                    // Unknown SSL error
                    printf("SSL error: Unknown error code: %d\n", ssl_error);
                    ERR_print_errors_fp(stderr);
                    SSL_free(ssl);
                    close(client_fd);
                    return NULL;
            }
        } else {
            // bytes == 0, client closed connection without sending data
            printf("Client closed connection without sending data\n");
            SSL_free(ssl);
            close(client_fd);
            return NULL;
        }
    }

    printf("Received HTTPS request from client\n");

    // Create socket for backend HTTP server (non-SSL)
    int http_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (http_fd < 0) {
        perror("Failed to create socket to backend");
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    // Set backend connection socket to non-blocking
    if (setSocketNonBlocking(http_fd) < 0) {
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    // Configure the backend server address
    struct sockaddr_in backend_addr;
    memset(&backend_addr, 0, sizeof(backend_addr));
    backend_addr.sin_family = AF_INET;
    backend_addr.sin_port = htons(PORT);  // Backend HTTP port (not HTTPS)
    backend_addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

    // Attempt to connect to the backend
    int ret = connect(http_fd, (struct sockaddr*)&backend_addr, sizeof(backend_addr));

    // If the connection is in progress, wait until it's ready
    if (ret < 0 && errno != EINPROGRESS) {
        perror("Failed to connect to backend server");
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    // Use select() to wait for the socket to be ready for writing (i.e., the connection is established)
    fd_set writefds;
    FD_ZERO(&writefds);
    FD_SET(http_fd, &writefds);

    struct timeval timeout;
    timeout.tv_sec = 10;  // 10-second timeout
    timeout.tv_usec = 0;

    ret = select(http_fd + 1, NULL, &writefds, NULL, &timeout);

    if (ret <= 0) {
        if (ret == 0) {
            printf("Timeout while waiting for backend connection\n");
        } else {
            perror("select() error");
        }
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    // Check if the backend socket is ready for writing
    if (FD_ISSET(http_fd, &writefds)) {
        // Connection is established, proceed with sending data
        printf("Connected to backend server, forwarding request\n");
    } else {
        printf("Backend connection failed, no write access\n");
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    // Forward the client's HTTP request to the backend HTTP server
    if (send(http_fd, buffer, bytes, 0) < 0) {
        perror("Failed to send request to backend server");
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    // Set up a timeout for receiving data from the backend
    struct timeval tv;
    tv.tv_sec = RESPONSE_TIMEOUT; // 5 seconds timeout
    tv.tv_usec = 0;
    setsockopt(http_fd, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof(tv));

    // Use select() to wait for data on the backend socket
    fd_set readfds;
    FD_ZERO(&readfds);
    FD_SET(http_fd, &readfds);

    ret = select(http_fd + 1, &readfds, NULL, NULL, &tv);
    if (ret <= 0) {
        if (ret == 0) {
            printf("Timeout waiting for response from backend\n");
        } else {
            perror("Error with select()");
        }
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    // Read the backend response and forward it to the client
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

