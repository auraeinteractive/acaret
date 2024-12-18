#include "view.h"
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h> // For getcwd on POSIX systems
#include <limits.h> // For PATH_MAX
#include <string.h> // For strncat
#include <stddef.h>

// Callback to handle resource loading failures
static void on_resource_failed(WebKitWebResource *resource, GError *error, gpointer user_data) {
    fprintf(stderr, "Failed to load resource: %s\n", error->message);
}

// New function to convert file path to data URI for local assets
static char* convertDataURLToLocalPath(const char* cwd, const char* relative_path) {
    size_t path_length = strlen(cwd) + strlen("/assets/") + strlen(relative_path) + 1;
    char *full_path = malloc(path_length);
    if (!full_path) {
        fprintf(stderr, "Failed to allocate memory for full path.\n");
        return NULL;
    }
    
    if (snprintf(full_path, path_length, "%s/assets/%s", cwd, relative_path) < 0) {
        free(full_path);
        fprintf(stderr, "Failed to construct full path.\n");
        return NULL;
    }
    
    return full_path;
}

// Updated method to set HTML content from a file
void mlViewSetHTML(void *instance, void *data) {
    mlView *view = (mlView *)instance;
    char *filename = (char *)data;  // Use this if needed, otherwise remove
    
    char cwd[PATH_MAX];
    if (getcwd(cwd, sizeof(cwd)) == NULL) {
        fprintf(stderr, "Failed to get current working directory.\n");
        return;
    }

    char *path = malloc(PATH_MAX + strlen(filename) + 1);
    if (!path) {
        fprintf(stderr, "Failed to allocate memory for path.\n");
        return;
    }

    if (snprintf(path, PATH_MAX + strlen(filename) + 1, "%s/assets/%s", cwd, filename) < 0) {
        fprintf(stderr, "snprintf failed\n");
        free(path);
        return;
    }

    FILE *file = fopen(path, "r");
    if (!file) {
        fprintf(stderr, "Failed to open file: %s\n", path);
        free(path);
        return;
    }

    fseek(file, 0, SEEK_END);
    long size = ftell(file);
    rewind(file);

    printf("[HTML] Parsing file: %s\n", path);

    char *content = malloc(size + 1);
    if (!content) {
        fprintf(stderr, "Failed to allocate memory for file content\n");
        fclose(file);
        free(path);
        return;
    }
    
    printf(" > Now parsing markup.\n");
    fread(content, 1, size, file);
    content[size] = '\0';

    char *modified_content = strdup(content);
    if (!modified_content) {
        fprintf(stderr, "Failed to allocate memory for modified content\n");
        free(content);
        fclose(file);
        free(path);
        return;
    }

    char *start = modified_content;
    while (start && *start) {
        char *data_start = strstr(start, "data://");
        if (!data_start) break;

        char *end = strchr(data_start, '"');
        if (!end) {
            fprintf(stderr, "Malformed data URL: missing closing quote.\n");
            break;
        }
        
        *end = '\0';  // Null-terminate the string to get the relative path
        char *relative_path = data_start + strlen("data://");
        char *full_path = convertDataURLToLocalPath(cwd, relative_path);
        if (!full_path) {
            fprintf(stderr, "Failed to convert data URL to local path.\n");
            break;
        }

        // Calculate new length
        size_t prefix_length = data_start - modified_content;
        size_t new_length = prefix_length + strlen("file://") + strlen(full_path) + 2 + strlen(end + 1); // +2 for closing quote and null terminator
        char *new_content = malloc(new_length);
        if (!new_content) {
            fprintf(stderr, "Failed to allocate memory for new content.\n");
            free(full_path);
            break;
        }

        // Copy prefix part
        strncpy(new_content, modified_content, prefix_length);
        new_content[prefix_length] = '\0';

        // Concatenate parts
        strcat(new_content, "file://");
        strcat(new_content, full_path);
        strcat(new_content, "\""); // Add the closing quote

        // Instead of strcat, use strcpy for the remaining part
        strcpy(new_content + strlen(new_content), end + 1); // This copies the rest of the string including the null terminator

        free(modified_content);
        modified_content = new_content;
        start = modified_content + prefix_length + strlen("file://") + strlen(full_path) + 1; // +1 for the quote
        free(full_path);
    }

    printf(" > Done parsing markup.\n");

    if (modified_content != NULL) {
        printf("Markup was: %s\n", modified_content);
        webkit_web_view_load_html(view->webview, modified_content, NULL);

        // Check if there's any error loading the content
        WebKitWebResource *resource = webkit_web_view_get_main_resource(view->webview);
        if (resource) {
            g_signal_connect(resource, "failed", G_CALLBACK(on_resource_failed), NULL);
        }

        free(modified_content);
    }

    free(content);
    fclose(file);
    free(path);
}

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
    // Dynamically create the derived mlView object
    mlView *view = (mlView *)mlObjectCreateWithSize(sizeof(mlObject), sizeof(mlView), parent);
    if (!view) {
        fprintf(stderr, "Failed to create mlView object\n");
        return NULL;
    }

    // Initialize GTK window
    view->window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    if (!view->window) {
        fprintf(stderr, "Failed to create GTK window\n");
        free(view); // Clean up memory
        return NULL;
    }
    gtk_window_set_title(GTK_WINDOW(view->window), "WebKitGTK View");
    gtk_window_set_default_size(GTK_WINDOW(view->window), 1280, 800);

    // Create the WebView
    view->webview = WEBKIT_WEB_VIEW(webkit_web_view_new());
    if (!view->webview) {
        fprintf(stderr, "Failed to create WebKit WebView\n");
        gtk_widget_destroy(view->window); // Destroy the GTK window
        free(view); // Clean up memory
        return NULL;
    }
    
    // Set up settings for file access if not already done
    WebKitSettings *settings = webkit_web_view_get_settings(view->webview);
    webkit_settings_set_allow_file_access_from_file_urls(settings, TRUE);
    webkit_settings_set_auto_load_images(settings, TRUE); // Ensure images load if they're in CSS
    webkit_settings_set_enable_javascript(settings, TRUE); // In case your CSS depends on JavaScript for some reason
    webkit_settings_set_enable_developer_extras(settings, TRUE);
    webkit_settings_set_disable_web_security(settings, TRUE);


    webkit_web_view_load_html(view->webview, "<html><body><h1>Hello, World!</h1></body></html>", NULL);
    gtk_container_add(GTK_CONTAINER(view->window), GTK_WIDGET(view->webview));

    // Add event listeners (e.g., window close event)
    mlAddEvent((mlObject *)view, "closed", mlViewOnWindowClosed);

    // Automatically connect the "destroy" signal for the window
    g_signal_connect(G_OBJECT(view->window), "destroy", G_CALLBACK(mlViewOnWindowClosed), (gpointer)view);

    // Set the method table for the view
    mlMethodEntry *method_table = malloc(sizeof(mlMethodEntry) * 3);
    if (method_table) {
        method_table[0] = (mlMethodEntry){"setSize", mlViewSetSize};
        method_table[1] = (mlMethodEntry){"show", mlViewShow};
        method_table[2] = (mlMethodEntry){"setHTML", mlViewSetHTML};
        view->base.method_table = method_table;
        view->base.method_count = 3;
    } else {
        fprintf(stderr, "Failed to allocate memory for method table\n");
        gtk_widget_destroy(view->window);
        free(view);
        return NULL;
    }

    return (mlObject *)view;
}



// Destroy a view object and free resources
void mlViewDestroy(mlObject *obj) {
    if (!obj) return;

    mlView *view = (mlView *)obj;

    // Destroy the GTK window if it exists
    if (view->window) {
        gtk_widget_destroy(view->window);
        view->window = NULL;
    }

    // WebView cleanup (if needed)
    if (view->webview) {
        // No explicit destroy function is needed for WebKitGTK web views, as
        // GTK widget destruction will handle it. Nullify the pointer for safety.
        view->webview = NULL;
    }

    // Call the base destroy function to clean up common resources
    mlObjectDestroy(obj);
}

