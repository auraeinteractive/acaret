#include "init.h"
#include <gtk/gtk.h>  // Include GTK headers here

// Placeholder functions for initialization, main loop, and quitting
// These will use GTK now but can be switched later

void mlInit(int *argc, char ***argv) {
    gtk_init(argc, argv);
}

void mlMain() {
    gtk_main();
}

void mlQuit() {
    gtk_main_quit();
}
