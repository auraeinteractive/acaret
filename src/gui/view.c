#include "view.h"
#include <stdio.h>
#include <stdlib.h>

// Method to set the size of the view
void mlViewSetSize(void *instance, void *data) {
    mlView *view = (mlView *)instance;
    int *size = (int *)data;
    printf("Setting view size to %dx%d\n", size[0], size[1]);
    gtk_window_resize(GTK_WINDOW(view->window), size[0], size[1]);
}

// Show the view (make it visible)
void mlViewShow(void *instance, void *data) {
    mlView *view = (mlView *)instance;
    printf("Showing view\n");
    gtk_widget_show_all(view->window);
}

// Handle the window close event
void mlViewOnWindowClosed(void *instance, void *data) {
    printf("Window closed.\n");
    if (instance) {  // Check if the instance is still valid
        mlTriggerEvent((mlObject *)instance, "closed", NULL);
    }
}

// Create a new view (this function should be called from the main program)
mlObject *mlViewCreate(mlObject *parent) {
    mlView *view = (mlView *)mlCreateObject(parent);

    // Initialize GTK and create the window
    view->window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(view->window), "WebKitGTK View");
    gtk_window_set_default_size(GTK_WINDOW(view->window), 1280, 800);
    
    // Create the WebView
    view->webview = WEBKIT_WEB_VIEW(webkit_web_view_new());
    webkit_web_view_load_html(view->webview, "<html><body><h1>Hello, World!</h1></body></html>", NULL);
    gtk_container_add(GTK_CONTAINER(view->window), GTK_WIDGET(view->webview));

    // Add event listeners (e.g., window close event)
    mlAddEvent((mlObject *)view, "closed", mlViewOnWindowClosed);

    // Automatically connect the "destroy" signal for the window
    g_signal_connect(G_OBJECT(view->window), "destroy", G_CALLBACK(mlViewOnWindowClosed), (gpointer)view);

    // Set the method table for the view
    mlMethodEntry *method_table = malloc(sizeof(mlMethodEntry) * 2);
    if (method_table) {
        method_table[0] = (mlMethodEntry){"setSize", mlViewSetSize};
        method_table[1] = (mlMethodEntry){"show", mlViewShow};
        view->base.method_table = method_table;
        view->base.method_count = 2;
    } else {
        fprintf(stderr, "Failed to allocate memory for method table\n");
        // Handle error appropriately
    }

    return (mlObject *)view;
}
