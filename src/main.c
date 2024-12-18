#include "gui/view.h"
#include "gui/init.h"  // Include the new abstracted init functions

// Function to quit the application
void doQuit() {
    printf( "Handling quit.\n" );
    mlQuit(); // Assuming mlQuit is defined in init.c
}

int main(int argc, char *argv[]) {
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
    mlObjectDestroy(view);

    return 0;
}
