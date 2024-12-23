#include "gui/view.h"
#include "gui/init.h"  // Include the new abstracted init functions
#include "proxy/proxy.h"
#include <pthread.h>

// Function to quit the application
void doQuit() {
    printf( "Handling quit.\n" );
    mlQuit(); // Assuming mlQuit is defined in init.c
}

void* proxyServerThread(void* arg) {
    // Start the proxy server in a separate thread
    if (startProxyServer() != 0) {
        printf("Failed starting proxy. Aborting.\n");
        return NULL;
    }
    return NULL;
}

int main(int argc, char *argv[]) {
    // Start the proxy server in a new thread
    printf("Starting proxy.\n");
    pthread_t proxy_thread;
    if (pthread_create(&proxy_thread, NULL, proxyServerThread, NULL) != 0) {
        printf("Failed to create proxy server thread. Aborting.\n");
        return -1;
    }
    
    mlInit(&argc, &argv);  // Initialize GTK

    // Create a view object (inherits from base object)
    mlObject *view = mlViewCreate(NULL);

    // Set size of the view
    int size[2] = {1280, 800};
    mlDoMethod(view, "setSize", size);  // Call the setSize method

    // Set HTML file
    mlDoMethod(view, "setHTML", "main.html" );
    
    // Show the view
    mlDoMethod(view, "show", NULL);  // Call the show method


    // Register doQuit function to be called when the view is closed
    mlAddEvent(view, "closed", (mlEventCallback)doQuit);

    // Run the main loop
    mlMain();

    // Clean up by destroying the view object
    mlViewDestroy(view);

    return 0;
}
