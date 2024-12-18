#include "view.h"
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h> // For getcwd on POSIX systems
#include <limits.h> // For PATH_MAX
#include <string.h> // For strncat

// New function to convert file path to data URI for local assets
static char* createDataURI(const char* path) {
    FILE *file = fopen(path, "r");
    if (!file) {
        fprintf(stderr, "Failed to open file: %s\n", path);
        return NULL;
    }

    fseek(file, 0, SEEK_END);
    long size = ftell(file);
    rewind(file);

    char *content = malloc(size + 1);
    if (!content) {
        fclose(file);
        fprintf(stderr, "Failed to allocate memory for file content\n");
        return NULL;
    }

    fread(content, 1, size, file);
    content[size] = '\0'; // Null-terminate
    fclose(file);

    // Determine MIME type based on file extension (more comprehensive)
    const char *mime_type;
    if (strstr(path, ".js")) {
        mime_type = "text/javascript";
    } else if (strstr(path, ".css")) {
        mime_type = "text/css";
    } else {
        mime_type = "text/html"; // Default to HTML for unknown types
    }

    size_t uri_length = strlen(mime_type) + size + 64; // +64 for "data:", ",base64," etc.
    char *uri = malloc(uri_length);
    if (!uri) {
        free(content);
        fprintf(stderr, "Failed to allocate memory for URI\n");
        return NULL;
    }

    if (snprintf(uri, uri_length, "data:%s;base64,%s", mime_type, content) < 0) {
        free(content);
        free(uri);
        fprintf(stderr, "Failed to create URI\n");
        return NULL;
    }

    free(content);
    return uri;
}

// Method to set HTML content from a file
void mlViewSetHTML(void *instance, void *data) {
    mlView *view = (mlView *)instance;
    char *filename = (char *)data;
    
    if (!filename) {
        fprintf(stderr, "No filename provided.\n");
        return;
    }

    char cwd[PATH_MAX];
    if (getcwd(cwd, sizeof(cwd)) == NULL) {
        fprintf(stderr, "Failed to get current working directory.\n");
        return;
    }

    // Construct the full path to the file dynamically
    char *path = malloc(PATH_MAX + strlen(filename) + 1); // +1 for null terminator
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

    printf( "[HTML] Parsing file: %s\n", path );

    char *content = malloc(size + 1); // +1 for null terminator
    if (!content) {
        fprintf(stderr, "Failed to allocate memory for file content\n");
        fclose(file);
        free(path);
        return;
    }
    
    printf( " > Now parsing markup.\n" );
    fread(content, 1, size, file);
    content[size] = '\0'; // Null-terminate the string

    // Handle local assets via data URI
    char *modified_content = strdup(content);
    if (!modified_content) {
        fprintf(stderr, "Failed to allocate memory for modified content\n");
        free(content);
        fclose(file);
        free(path);
        return;
    }

    char *start = modified_content;
    while (start && *start) {  // Check if start is valid and not at end
        // Look for both src="data://" and href="data://"
        char *src_start = strstr(start, "src=\"data://");
        char *href_start = strstr(start, "href=\"data://");
        if (src_start == NULL && href_start == NULL) break;
        
        char *current = NULL;
        if (src_start && href_start) {
            // Both pointers are valid, take the one that appears first
            current = (src_start < href_start) ? src_start : href_start;
        } else if (src_start) {
            // Only src_start is valid
            current = src_start;
        } else if (href_start) {
            // Only href_start is valid
            current = href_start;
        } else {
            // Neither pointer is valid
            break;
        }
        
        char *end = strchr(current, '"');
        if (end) {
            *end = '\0';
            char *relative_path = current + (current == src_start ? 12 : 13); // Skip "src=\"data://" or "href=\"data://"
            printf( " > Found something %s\n", relative_path );
            
            char *full_path = malloc(PATH_MAX + strlen(relative_path) + 1);
            if (!full_path) {
                fprintf(stderr, "Failed to allocate memory for full_path.\n");
                free(modified_content);
                free(content);
                fclose(file);
                free(path);
                return;
            }

            if (snprintf(full_path, PATH_MAX + strlen(relative_path) + 1, "%s/assets/%s", cwd, relative_path) < 0) {
                fprintf(stderr, "snprintf failed\n");
                free(full_path);
                free(modified_content);
                free(content);
                fclose(file);
                free(path);
                return;
            }

            char *data_uri = createDataURI(full_path);
            if (data_uri) {
                printf( " > Now parsing asset: %s.\n", data_uri );
            
                // Replace the data:// with the actual data URI
                size_t length_to_replace = strlen(current == src_start ? "src=\"data://" : "href=\"data://") + strlen(relative_path);
                memmove(current, current + length_to_replace, strlen(current + length_to_replace) + 1);
                size_t insert_point = current - modified_content;
                char *new_content = malloc(strlen(modified_content) + strlen(data_uri) + 1);
                if (!new_content) {
                    fprintf(stderr, "Failed to allocate memory for new_content.\n");
                    free(data_uri);
                    free(full_path);
                    free(modified_content);
                    free(content);
                    fclose(file);
                    free(path);
                    return;
                }
                strncpy(new_content, modified_content, insert_point);
                new_content[insert_point] = '\0';
                strcat(new_content, data_uri);
                strcat(new_content, modified_content + insert_point);
                free(modified_content);
                modified_content = new_content;
                free(data_uri);
            }
            free(full_path);
            start = end + 1; // Move past the replaced part
        } else {
            printf( " > Could not find anything.\n" );
            break;
        }
    }
    
    printf( " > Done parsing markup.\n" );

    webkit_web_view_load_html(view->webview, modified_content, NULL);
    free(modified_content);
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
    mlView *view = (mlView *)mlObjectCreate(parent);
    if (!view) {
        fprintf(stderr, "Failed to create mlView object\n");
        return NULL;
    }

    // Initialize GTK and create the window
    view->window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    if (!view->window) {
        fprintf(stderr, "Failed to create GTK window\n");
        return NULL;
    }
    gtk_window_set_title(GTK_WINDOW(view->window), "WebKitGTK View");
    gtk_window_set_default_size(GTK_WINDOW(view->window), 1280, 800);
    
    // Create the WebView
    view->webview = WEBKIT_WEB_VIEW(webkit_web_view_new());
    if (!view->webview) {
        fprintf(stderr, "Failed to create WebKit WebView\n");
        return NULL;
    }
    webkit_web_view_load_html(view->webview, "<html><body><h1>Hello, World!</h1></body></html>", NULL);
    gtk_container_add(GTK_CONTAINER(view->window), GTK_WIDGET(view->webview));

    // Add event listeners (e.g., window close event)
    mlAddEvent((mlObject *)view, "closed", mlViewOnWindowClosed);

    // Automatically connect the "destroy" signal for the window
    g_signal_connect(G_OBJECT(view->window), "destroy", G_CALLBACK(mlViewOnWindowClosed), (gpointer)view);

    // Set the method table for the view
    mlMethodEntry *method_table = malloc(sizeof(mlMethodEntry) * 3);  // Corrected size
    if (method_table) {
        method_table[0] = (mlMethodEntry){"setSize", mlViewSetSize};
        method_table[1] = (mlMethodEntry){"show", mlViewShow};
        method_table[2] = (mlMethodEntry){"setHTML", mlViewSetHTML}; 
        view->base.method_table = method_table;
        view->base.method_count = 3;
    } else {
        fprintf(stderr, "Failed to allocate memory for method table\n");
        // Handle error appropriately, perhaps return NULL or use a default method table
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

