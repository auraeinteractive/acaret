#include "gui/view.h"
#include "gui/init.h"  // Include the new abstracted init functions
#include "gui/signals.h"
#include "proxy/proxy.h"
#include "system/session.h"

// Function to quit the application
mlObject *mainView = NULL;
pthread_mutex_t networkMutex;
int hasQuit = 0;

// Initiates the program
int main( int argc, char *argv[] ) 
{
    // Initialize session
    sessionInit();
    
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
    int size[ 2 ] = { 1280, 800 };
    mlDoMethod( mainView, "setSize", size );  // Call the setSize method

    // Set HTML file
    mlDoMethod( mainView, "setHTML", "main.html" );
    
    // Show the view
    mlDoMethod( mainView, "show", NULL );  // Call the show method

    // Register doQuit function to be called when the view is closed
    mlAddEvent( mainView, "closed", ( mlEventCallback )doQuit );

    // Run the main loop
    mlMain();
    
    doQuit();

    return 0;
}

void doQuit()
{
    if( hasQuit == 0 )
    {
        hasQuit = 1;
        printf( "[doQuit] Handling quit.\n" );
        stopProxyNetwork();
        if( mainView )
        {
            mlViewDestroy( mainView );
            mainView = NULL;
        }
        mlQuit(); // Assuming mlQuit is defined in init.c
        printf( "[doQuit] All operating should now be stopped.\n" );
    }
    else
    {
        printf( "[doQuit] Already quit.\n" );
    }
}


