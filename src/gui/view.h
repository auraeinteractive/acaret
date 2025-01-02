#ifndef GUI_VIEW_H
#define GUI_VIEW_H

#include "../oop/base.h"
#include <webkit2/webkit2.h>
#include <gtk/gtk.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h> // For getcwd on POSIX systems
#include <limits.h> // For PATH_MAX
#include <string.h> // For strncat
#include <stddef.h>
#include <gio/gio.h>
#include <dirent.h>
#include <sys/stat.h>
#include <glib.h>
#include "../proxy/proxy.h"
#include "../system/signals.h"

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

void mlViewDestroy(mlObject *instance);

#endif // GUI_VIEW_H

