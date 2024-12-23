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
#include <stdbool.h>

#define PORT 11434
#define PROXYPORT 8089
#define TIMEOUT_SECONDS 10

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

    // Perform SSL handshake (blocking mode)
    int ssl_err;
    while ((ssl_err = SSL_accept(ssl)) <= 0) {
        int error_code = SSL_get_error(ssl, ssl_err);

        if (error_code == SSL_ERROR_WANT_READ || error_code == SSL_ERROR_WANT_WRITE) {
            break;
        }

        printf("SSL_accept failed with error code: %d\n", error_code);
        ERR_print_errors_fp(stderr);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    printf("SSL handshake successful\n");

    // Read data from the client in a loop until successful or an error occurs
    printf("Attempting to read data from client...\n");
    char buffer[4096] = {0};
    int bytes = 0;
    int total_bytes_received = 0;
    int content_length = 0;
    bool content_length_found = false;

    // Loop to read the full request headers and body
    while (1) {
        bytes = SSL_read(ssl, buffer, sizeof(buffer));

        if (bytes > 0) {
            total_bytes_received += bytes;
            printf("Successfully read %d bytes from client\n", bytes);
            printf("Data: %.*s\n", bytes, buffer);

            // Look for the Content-Length header (if it's a POST request)
            if (!content_length_found) {
                char* content_length_header = strstr(buffer, "Content-Length: ");
                if (content_length_header) {
                    sscanf(content_length_header, "Content-Length: %d", &content_length);
                    content_length_found = true;
                    printf("Found Content-Length: %d\n", content_length);
                }
            }

            // If all the data has been received, break the loop
            if (content_length_found && total_bytes_received >= content_length) {
                break;
            }
        } else if (bytes < 0) {
            int ssl_error = SSL_get_error(ssl, bytes);

            switch (ssl_error) {
                case SSL_ERROR_WANT_READ:
                case SSL_ERROR_WANT_WRITE:
                    continue;
                case SSL_ERROR_ZERO_RETURN:
                    printf("SSL error: Connection closed gracefully by client\n");
                    SSL_free(ssl);
                    close(client_fd);
                    return NULL;
                case SSL_ERROR_SYSCALL:
                    printf("SSL error: System call failure\n");
                    if (errno != 0) {
                        printf("System error code: %d\n", errno);
                    }
                    SSL_free(ssl);
                    close(client_fd);
                    return NULL;
                case SSL_ERROR_SSL:
                    printf("SSL error: Generic SSL failure\n");
                    ERR_print_errors_fp(stderr);
                    SSL_free(ssl);
                    close(client_fd);
                    return NULL;
                default:
                    printf("SSL error: Unknown error code: %d\n", ssl_error);
                    ERR_print_errors_fp(stderr);
                    SSL_free(ssl);
                    close(client_fd);
                    return NULL;
            }
        } else {
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
    int flags = fcntl(http_fd, F_GETFL, 0);
    if (flags == -1) {
        perror("fcntl(F_GETFL) failed");
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    if (fcntl(http_fd, F_SETFL, flags | O_NONBLOCK) == -1) {
        perror("fcntl(F_SETFL) failed");
    }

    struct sockaddr_in backend_addr;
    memset(&backend_addr, 0, sizeof(backend_addr));
    backend_addr.sin_family = AF_INET;
    backend_addr.sin_port = htons(PORT);  // Backend HTTP port (not HTTPS)
    backend_addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

    printf("Trying to connect to HTTP backend...\n");

    // Attempt to connect to the backend (non-blocking mode)
    int ret = connect(http_fd, (struct sockaddr*)&backend_addr, sizeof(backend_addr));
    if (ret < 0 && errno != EINPROGRESS) {
        perror("Failed to connect to backend server");
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    printf("Connected to backend server, forwarding request\n");

    // Forward the full HTTP request (headers + body) to the backend server
    printf("Sending request to backend server...\n");

    // Send the headers first
    char* request_headers = "POST / HTTP/1.1\r\n";
    char* host_header = "Host: localhost\r\n";  // Adjust the host header as needed
    char post_header[256];
    snprintf(post_header, sizeof(post_header), "Content-Length: %d\r\n", content_length);
    
    if (send(http_fd, request_headers, strlen(request_headers), 0) < 0) {
        perror("Failed to send headers to backend server");
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }
    
    if (send(http_fd, host_header, strlen(host_header), 0) < 0) {
        perror("Failed to send Host header to backend server");
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    if (send(http_fd, post_header, strlen(post_header), 0) < 0) {
        perror("Failed to send Content-Length header to backend server");
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    if (send(http_fd, "\r\n", 2, 0) < 0) {
        perror("Failed to send blank line after headers to backend server");
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    // Send the body content
    printf("Forwarding body to backend server\n");
    if (send(http_fd, buffer, total_bytes_received, 0) < 0) {
        perror("Failed to send body to backend server");
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    // Implement a retry mechanism for recv() with a 10-second timeout
    printf("Starting event stream forwarding loop...\n");

    struct timeval timeout;
    timeout.tv_sec = TIMEOUT_SECONDS;
    timeout.tv_usec = 0;

    while (1) {
        fd_set read_fds;
        FD_ZERO(&read_fds);
        FD_SET(http_fd, &read_fds);

        printf("Attempting to select with timeout: %ld seconds\n", TIMEOUT_SECONDS);

        int select_ret = select(http_fd + 1, &read_fds, NULL, NULL, &timeout);

        printf("Select returned: %d\n", select_ret);

        if (select_ret < 0) {
            perror("select failed");
            break;
        } else if (select_ret == 0) {
            printf("Timeout occurred while waiting for data from backend server\n");
            break;
        } else if (FD_ISSET(http_fd, &read_fds)) {
            printf("Data available on backend server socket\n");

            ssize_t bytes_received = recv(http_fd, buffer, sizeof(buffer), 0);

            printf("Received %ld bytes from backend server\n", bytes_received);

            if (bytes_received < 0) {
                if (errno == EINTR) {
                    printf("Interrupt occurred during recv(), retrying...\n");
                    continue;
                }
                perror("Error reading from backend server");
                break;
            } else if (bytes_received == 0) {
                printf("Backend server closed the connection (bytes == 0)\n");
                break;
            } else {
                // Debug output of the received data
                printf("Data from backend server: %.*s\n", (int)bytes_received, buffer);

                int ssl_ret = SSL_write(ssl, buffer, bytes_received);
                if (ssl_ret <= 0) {
                    ERR_print_errors_fp(stderr);
                    printf("SSL_write failed while sending data to client\n");
                    break;
                } else {
                    printf("Successfully sent %d bytes to client via SSL\n", ssl_ret);
                }
            }
        } else {
            printf("No data ready on backend server socket\n");
        }
    }

    printf("Cleaning up backend HTTP connection...\n");
    close(http_fd);

    printf("Cleaning up client SSL connection...\n");
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

