#include "gui/view.h"
#include "gui/init.h"  // Include the new abstracted init functions
#include "proxy/proxy.h"

// Function to quit the application
void doQuit();
mlObject *mainView;
pthread_mutex_t networkMutex;

int main(int argc, char *argv[]) {
    // Start the proxy server
    printf( "Starting proxy.\n" );
    if( startProxyServer() != 0 )
    {
        printf( "Failed starting proxy. Aborting.\n" );
        return -1;
    }
    
    mlInit(&argc, &argv);  // Initialize GTK

    // Create a view object (inherits from base object)
    mainView = mlViewCreate(NULL);

    // Set size of the view
    int size[2] = {1280, 800};
    mlDoMethod(mainView, "setSize", size);  // Call the setSize method

    // Set HTML file
    mlDoMethod( mainView, "setHTML", "main.html" );
    
    // Show the view
    mlDoMethod( mainView, "show", NULL );  // Call the show method

    // Register doQuit function to be called when the view is closed
    mlAddEvent(mainView, "closed", ( mlEventCallback )doQuit);

    // Run the main loop
    mlMain();
    
    doQuit();

    return 0;
}

void doQuit()
{
    printf( "Handling quit.\n" );
    mlViewDestroy( mainView );
    stopProxyNetwork();
    mlQuit(); // Assuming mlQuit is defined in init.c
    printf( "All operating should now be stopped.\n" );
}
