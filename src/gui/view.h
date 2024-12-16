#ifndef GUI_VIEW_H
#define GUI_VIEW_H

#include "../oop/base.h"
#include <webkit2/webkit2.h>
#include <gtk/gtk.h>

typedef struct mlView {
    mlObject base;  // Inherits from mlObject
    GtkWidget *window;  // GTK window widget
    WebKitWebView *webview;  // WebView for rendering content
} mlView;

// Create a new view
mlObject *mlViewCreate(mlObject *parent);

// View-specific methods (to be added to method table)
void mlViewSetSize(void *instance, void *data);
void mlViewShow(void *instance, void *data);

// Setting HTML content
void mlViewSetHTML(void *instance, void *data);

// Event handling methods
void mlViewOnWindowClosed(void *instance, void *data);

#endif // GUI_VIEW_H

