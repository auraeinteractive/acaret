#include "proxy.h"

#define PORT 11434
#define PROXYPORT 8089
#define TIMEOUT_SECONDS 10

static pthread_t proxyThread;
extern pthread_mutex_t networkMutex;
int *networkRunning;

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
    
    int optval = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &optval, sizeof(optval));

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
    for( ; ; )
    {
        pthread_mutex_lock( &networkMutex );
        
        if( *networkRunning == 0 )
        {
            pthread_mutex_unlock( &networkMutex );
            break;
        }
        pthread_mutex_unlock( &networkMutex );
        usleep( 2500 );
        
           
        struct epoll_event events[10];  // max 10 connections at once
        //printf("Waiting for connections (running %d)\n", *networkRunning);
        int num_events = epoll_wait(epoll_fd, events, 10, 0);
        if (num_events == -1) {
            perror("Epoll wait failed");
            break;
        }
        
        //printf("Got events %d\n", num_events);

        // Handle events
        for( int i = 0; i < num_events; i++ )
        {
            if( events[ i ].data.fd == server_fd )
            {
                // New connection, accept it
                struct sockaddr_in client_addr;
                socklen_t client_len = sizeof(client_addr);
                int client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
                if( client_fd < 0 )
                {
                    perror("Accept failed");
                    continue;
                }

                // Set client socket to non-blocking mode
                if( setSocketNonBlocking( client_fd ) < 0 )
                {
                    close( client_fd );
                    continue;
                }

                // Allocate memory for the thread arguments and pass SSL_CTX and client_fd
                thread_args_t* thread_args = malloc( sizeof( thread_args_t ) );
                thread_args->ctx = ctx;
                thread_args->client_fd = client_fd;

                // Create a new thread to handle the client
                pthread_t client_thread;
                if( pthread_create( &client_thread, NULL, handleClientConnection, thread_args ) != 0 )
                {
                    perror("Thread creation failed");
                    free( thread_args );
                    close( client_fd );
                    continue;
                }

                // Detach the thread so it cleans up after itself
                pthread_detach( client_thread );
            }
        }
    }

    // Cleanup resources
    close(server_fd);
    SSL_CTX_free( ctx );
    EVP_cleanup();
    ERR_free_strings();
    CRYPTO_cleanup_all_ex_data();

    return NULL;
}

// Function to print HTTP request with colorized output
void print_green(const char *msg) {
    printf("\033[0;32m%s\033[0m", msg);  // Green color for console output
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
            continue;
        }

        printf("SSL_accept failed with error code: %d\n", error_code);
        ERR_print_errors_fp(stderr);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    printf("SSL handshake successful\n");

    // Create socket for backend HTTP server (non-SSL)
    int http_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (http_fd < 0) {
        perror("Failed to create socket to backend");
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    struct sockaddr_in backend_addr;
    memset(&backend_addr, 0, sizeof(backend_addr));
    backend_addr.sin_family = AF_INET;
    backend_addr.sin_port = htons(PORT);  // Backend HTTP port set to 11434 as defined by PORT
    backend_addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);  // localhost address

    printf("Trying to connect to HTTP backend at localhost:11434...\n");

    // Attempt to connect to the backend (blocking mode)
    if (connect(http_fd, (struct sockaddr*)&backend_addr, sizeof(backend_addr)) < 0) {
        perror("Failed to connect to backend server");
        close(http_fd);
        SSL_free(ssl);
        close(client_fd);
        return NULL;
    }

    printf("Connected to backend server, forwarding request\n");

    // Buffer for data read from client
    #define BUFLENGTH 18192
    char buffer[BUFLENGTH];
    int bytes = 0;
    #define READ_RETRIES 300

    // Start forwarding data as it's received
    char *send_buffer = calloc(BUFLENGTH, 1); // Allocate space for the send buffer (adjust the size if needed)
    if (!send_buffer) {
        perror("Failed to allocate memory for send buffer");
        return NULL;
    }

    size_t send_buffer_len = 0; // This will track the length of the data in send_buffer
    int retries = READ_RETRIES;
    int waitLength = 5;

    while (1) {
        memset( buffer, 0, BUFLENGTH );
        bytes = SSL_read(ssl, buffer, BUFLENGTH);
        if (bytes > 0) {
            retries = READ_RETRIES;
            //printf("Forwarding %d bytes from client to backend\n", bytes);

            // Aggregate the received data into send_buffer
            //print_green( "MORE DATA:\n");
            printf( "%s\n", buffer );
            if (send_buffer_len + bytes > BUFLENGTH) { // Check if we have enough space in the buffer
                size_t new_len = send_buffer_len + bytes;
                send_buffer = realloc(send_buffer, new_len);
                if (!send_buffer) {
                    perror("Failed to realloc memory for send buffer");
                    break;
                }
            }

            memcpy(send_buffer + send_buffer_len, buffer, bytes); // Append received data to send_buffer
            send_buffer_len += bytes;

        } else if (bytes == 0) {
            // End of data from client, close the connection
            printf("Client closed connection\n");
            break;
        } else {
            int ssl_error = SSL_get_error(ssl, bytes);
            if (ssl_error == SSL_ERROR_WANT_READ || ssl_error == SSL_ERROR_WANT_WRITE) {
                if (retries-- == 0) {
                    printf("--\nRead retries exhausted\n");
                    break;
                }
                usleep( waitLength );
                if( waitLength < 250 )
                    waitLength += 5;
                continue;
            } else {
                perror("Error reading from client");
                break;
            }
        }
    }
    
    // Only filter headers after the while loop
    const char *allowed_headers[] = {
        "Host",
        "User-Agent",
        "Accept",
        "Content-Type",
        "Content-Length"
    };
    size_t allowed_headers_count = sizeof(allowed_headers) / sizeof(allowed_headers[0]);

    // Temporary buffer for filtered headers
    char *filtered_headers = malloc(send_buffer_len);
    if (!filtered_headers) {
        perror("Failed to allocate memory for filtered headers");
        return NULL;
    }

    char *current_pos = send_buffer;
    char *line_end;
    size_t filtered_len = 0;

    // Keep the request line (e.g., POST /v1/chat/completions HTTP/1.1)
    line_end = strstr(current_pos, "\r\n");
    if (!line_end) {
        fprintf(stderr, "Malformed HTTP request: Missing CRLF\n");
        free(filtered_headers);
        return NULL;
    }
    size_t line_len = line_end - current_pos + 2; // Include \r\n
    memcpy(filtered_headers + filtered_len, current_pos, line_len);
    filtered_len += line_len;
    current_pos += line_len;

    // Process headers line by line
    while ((line_end = strstr(current_pos, "\r\n")) != NULL && line_end != current_pos) {
        line_len = line_end - current_pos;
        for (size_t i = 0; i < allowed_headers_count; i++) {
            size_t key_len = strlen(allowed_headers[i]);
            if (strncmp(current_pos, allowed_headers[i], key_len) == 0 && current_pos[key_len] == ':') {
                // Copy matching header
                memcpy(filtered_headers + filtered_len, current_pos, line_len);
                filtered_len += line_len;
                memcpy(filtered_headers + filtered_len, "\r\n", 2); // Add CRLF
                filtered_len += 2;
                break;
            }
        }
        current_pos = line_end + 2; // Move to the next line
    }

    // Add the empty line separating headers and POST data
    if (current_pos[0] == '\r' && current_pos[1] == '\n') {
        memcpy(filtered_headers + filtered_len, "\r\n", 2);
        filtered_len += 2;
        current_pos += 2;
    }

    // Copy the remaining POST data
    size_t remaining_len = send_buffer_len - (current_pos - send_buffer);
    memcpy(filtered_headers + filtered_len, current_pos, remaining_len);
    filtered_len += remaining_len;

    // Null-terminate and replace send_buffer with the filtered version
    memcpy(send_buffer, filtered_headers, filtered_len);
    send_buffer_len = filtered_len;
    send_buffer[send_buffer_len] = '\0';

    // Clean up
    free(filtered_headers);

    // Optional: Print filtered request for debugging
    printf("Filtered Request:\n%s", send_buffer);



    // Send aggregated data to the backend server immediately after reading everything
    if( send_buffer )
    {
        printf( "Sending buffer: %s\n", send_buffer );
        if (send(http_fd, send_buffer, send_buffer_len, 0) < 0) {
            perror("Failed to send data to backend server");
        }

        // Free the allocated memory for send_buffer
        free(send_buffer);
    }

    // Set a 1-second timeout on the socket
    struct timeval timeout;
    timeout.tv_sec = 30; // 0 seconds
    timeout.tv_usec = 0; // 0 microseconds
    if (setsockopt(http_fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout)) < 0) {
        perror("Failed to set socket timeout");
        // Handle error if needed
    }
    
    // Forward the response from the backend to the client
    while (1) {
        memset(buffer, 0, sizeof(buffer)); // Clear the buffer before reading
        bytes = recv(http_fd, buffer, sizeof(buffer), 0);
        
        if( timeout.tv_sec == 30 )
        {
            timeout.tv_sec = 3; // 3 seconds
            timeout.tv_usec = 0; // 0 microseconds = 0.0 seconds
            if (setsockopt(http_fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout)) < 0) {
                perror("Failed to set socket timeout");
                // Handle error if needed
            }
        }
        
        if( bytes > 0 )
        {
            printf("Forwarding %d bytes from backend to client\n", bytes);

            // Print the data from backend in green before sending
            print_green("Sending the following data to client:\n");
            printf("%.*s\n", bytes, buffer);

            if( SSL_write( ssl, buffer, bytes ) <= 0 )
            {
                ERR_print_errors_fp( stderr );
                printf("SSL_write failed while sending data to client\n");
                break;
            }
        }
        else if (bytes == 0)
        {
            // End of data from backend, close the connection
            printf("Backend server closed connection\n");
            break;
        }
        else
        {
            if( errno == EAGAIN || errno == EWOULDBLOCK )
            {
                // Timeout occurred
                printf( "Timeout waiting for data from backend\n" );
                break;
            } 
            else
            {
                perror( "Error reading from backend server" );
                break;
            }
        }
    }

    // Cleanup
    printf("Cleaning up connections...\n");
    close(http_fd);
    SSL_free(ssl);
    close(client_fd);
    printf("Connection closed for client\n");

    return NULL;
}

unsigned int startProxyServer()
{
    networkRunning = malloc( sizeof( int ) );
    *networkRunning = 1;
    if( pthread_create( &proxyThread, NULL, proxyThreadFunction, NULL ) != 0 )
    {
        perror( "Failed to create proxy thread" );
        return 1;
    }
    return 0;
}

void stopProxyNetwork()
{
    printf( "[stopProxyNetwork] Waiting for mytex.\n" );
    pthread_mutex_lock( &networkMutex );
    printf( "[stopProxyNetwork] Setting network running to zero!\n" );
    *networkRunning = 0;
    pthread_mutex_unlock( &networkMutex );
}

void stopProxyServer()
{
    stopProxyNetwork();
    pthread_join(proxyThread, NULL);
    free( networkRunning );
    printf("Proxy server stopped.\n");
}

