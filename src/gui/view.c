#include "view.h"

// Callback to handle resource loading failures
static void on_resource_failed(WebKitWebResource *resource, GError *error, gpointer user_data) {
    fprintf(stderr, "Failed to load resource: %s\n", error->message);
}

// Function to read the file content
char *read_file_content(const char *file_path) {
    FILE *file = fopen(file_path, "rb");
    if (!file) {
        fprintf(stderr, "Error: Unable to open file '%s'\n", file_path);
        return NULL;
    }

    // Seek to the end to get the file size
    fseek(file, 0, SEEK_END);
    long file_size = ftell(file);
    rewind(file);

    // Allocate memory for the file content
    char *content = (char *)malloc(file_size + 1); // +1 for null terminator
    if (!content) {
        fprintf(stderr, "Error: Unable to allocate memory for file content\n");
        fclose(file);
        return NULL;
    }

    // Read the file into the buffer
    fread(content, 1, file_size, file);
    content[file_size] = '\0'; // Null-terminate the content
    fclose(file);
    return content;
}

// Function to pass file content to JavaScript
void pass_file_to_js(WebKitWebView *webview, const char *file_path) {
    char *file_content = read_file_content(file_path);
    if (!file_content) {
        return; // Exit if file could not be read
    }

    // Extract filename from the path

    char *encoded_content = g_base64_encode( ( const guchar * )file_content, strlen( file_content ) );
    const char *filename = g_path_get_basename( file_path );
    const char *dir_path = g_path_get_dirname( file_path );

    // Create the JavaScript command
    char *js_command = g_strdup_printf("loadFile(`%s`, \"%s\", \"%s\");",
                                        encoded_content,
                                        dir_path,
                                        filename);

    // Execute the JavaScript command in the WebView
    webkit_web_view_evaluate_javascript(webview, 
                                        js_command, 
                                        -1,  // -1 means the length is determined automatically
                                        NULL, // world_name (NULL for default)
                                        NULL, // source_uri (NULL for no source)
                                        NULL, // cancellable (no cancelation)
                                        NULL, // callback (no callback needed)
                                        NULL  // user_data (no user data)
    );

    // Free allocated resources
    free(file_content);
    g_free(encoded_content);
    g_free((void *)filename);
    g_free((void *)dir_path);
    g_free(js_command);
}

// Function to open file manager and get selected file path
char *open_file_dialog(GtkWindow *parent) {
    GtkWidget *dialog;
    char *filename = NULL;

    // Create a file chooser dialog
    dialog = gtk_file_chooser_dialog_new("Open File",
                                         parent,
                                         GTK_FILE_CHOOSER_ACTION_OPEN,
                                         "_Cancel", GTK_RESPONSE_CANCEL,
                                         "_Open", GTK_RESPONSE_ACCEPT,
                                         NULL);

    // Show the dialog and wait for a user response
    if (gtk_dialog_run(GTK_DIALOG(dialog)) == GTK_RESPONSE_ACCEPT) {
        GtkFileChooser *chooser = GTK_FILE_CHOOSER(dialog);
        // Get the selected file path
        filename = g_strdup(gtk_file_chooser_get_filename(chooser));
    }

    // Destroy the dialog after use
    gtk_widget_destroy(dialog);

    return filename; // Caller must free this memory
}

void mlViewOnWindowClosed(void *instance, void *data);
gboolean on_key_press_event(GtkWidget *widget, GdkEventKey *event, gpointer user_data) {
    if( ( event->state && GDK_CONTROL_MASK ) && event->keyval == GDK_KEY_o ){
        char *path = open_file_dialog( ( GtkWindow *)widget );
        if( path != NULL )
        {
            pass_file_to_js( ( WebKitWebView *)user_data, path );
            free( path );
        }
        return TRUE;
    }
    // Check if Ctrl+N is pressed
    else if( 
        ( event->state & GDK_CONTROL_MASK )
        && event->keyval == GDK_KEY_n
    )
    {
        g_print("Ctrl+N detected. New file triggered.\n");
        gchar *js_command = strdup( "newEditor()" );
        // Evaluate JavaScript in the WebView to handle the chunk
        webkit_web_view_evaluate_javascript((WebKitWebView *)user_data, 
                                            js_command, 
                                            -1,  // -1 means the length is determined automatically
                                            NULL, // world_name (NULL for default)
                                            NULL, // source_uri (NULL for no source)
                                            NULL, // cancellable (no cancelation)
                                            NULL, // callback (no callback needed)
                                            NULL  // user_data (no user data)
        );
        g_free(js_command);
        
        return TRUE; // Stop further handling of this event
    }
    // Check if Ctrl+Shift +S is pressed
    else if( 
        ( event->state & ( GDK_CONTROL_MASK | GDK_SHIFT_MASK ) ) == ( GDK_CONTROL_MASK | GDK_SHIFT_MASK ) 
        && event->keyval == GDK_KEY_S
    )
    {
        g_print("Ctrl+Shift+S detected. Save AS action triggered.\n");
        gchar *js_command = strdup( "saveAsData( currentEditor.path + currentEditor.filename + '\\n' + currentEditor.getValue() );" );
        // Evaluate JavaScript in the WebView to handle the chunk
        webkit_web_view_evaluate_javascript((WebKitWebView *)user_data, 
                                            js_command, 
                                            -1,  // -1 means the length is determined automatically
                                            NULL, // world_name (NULL for default)
                                            NULL, // source_uri (NULL for no source)
                                            NULL, // cancellable (no cancelation)
                                            NULL, // callback (no callback needed)
                                            NULL  // user_data (no user data)
        );
        g_free(js_command);
        
        return TRUE; // Stop further handling of this event
    }
    // Check if Ctrl+S is pressed
    else if ((event->state & GDK_CONTROL_MASK) && event->keyval == GDK_KEY_s) {
        g_print("Ctrl+S detected. Save action triggered.\n");
        gchar *js_command = strdup( "saveData( currentEditor.path + currentEditor.filename + '\\n' + currentEditor.getValue() );" );
        // Evaluate JavaScript in the WebView to handle the chunk
        webkit_web_view_evaluate_javascript((WebKitWebView *)user_data, 
                                            js_command, 
                                            -1,  // -1 means the length is determined automatically
                                            NULL, // world_name (NULL for default)
                                            NULL, // source_uri (NULL for no source)
                                            NULL, // cancellable (no cancelation)
                                            NULL, // callback (no callback needed)
                                            NULL  // user_data (no user data)
        );
        g_free(js_command);
        
        return TRUE; // Stop further handling of this event
    }
    if ((event->state & GDK_CONTROL_MASK) && event->keyval == GDK_KEY_q) {
        g_print("Ctrl+Q detected. Quit action triggered.\n");
        doQuit();
        return TRUE; // Stop further handling of this event
    }
    return FALSE; // Allow other handlers to process this event
}

// New function to convert file path to data URI for local assets
static char* convertDataURLToLocalPath( const char* cwd, const char* relative_path )
{
    size_t path_length = strlen( cwd ) + strlen( "/assets/" ) + strlen( relative_path ) + 1;
    char *full_path = malloc( path_length );
    if( !full_path )
    {
        fprintf(stderr, "Failed to allocate memory for full path.\n");
        return NULL;
    }
    
    if( snprintf( full_path, path_length, "%s/assets/%s", cwd, relative_path ) < 0 )
    {
        free( full_path );
        fprintf( stderr, "Failed to construct full path.\n" );
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

    //printf(" > Done parsing markup.\n");

    if (modified_content != NULL) {
        //printf("Markup was: %s\n", modified_content);
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
    if( instance )
    {  // Check if the instance is still valid
        printf( "Triggering \"closed\" event\n" );
        mlTriggerEvent( (mlObject *)instance, "closed", NULL );
        printf( "Event triggered.\n" );
    }
}

static void on_script_message_received_saveas(WebKitUserContentManager *manager,
                                              WebKitJavascriptResult *result,
                                              gpointer user_data);

// Callback to handle messages from JavaScript
static void on_script_message_received(WebKitUserContentManager *manager,
                                        WebKitJavascriptResult *result,
                                        gpointer user_data) {
    // Extract the message as a string
    JSCValue *value = webkit_javascript_result_get_js_value(result);
    if (jsc_value_is_string(value)) {
        gchar *message = jsc_value_to_string(value);
        g_print("Received message from JavaScript: %s\n", message);

        // Find the position of the newline (\n) that separates the path from the data
        char *newline_pos = strchr(message, '\n');
        printf( "Going ahead with save test!\n" );
        if (newline_pos) {
            // Null-terminate the path at the newline
            *newline_pos = '\0';
            const char *path = message;  // Path is everything before the newline
            const char *data = newline_pos + 1;  // Data is everything after the newlin

            printf( "Trying to save to: %s\n", path );
            if( path[0] != '/' )
            {
                printf( "No filename or path - trying save as\n" );
                return on_script_message_received_saveas( manager, result, user_data );
            }

            // Save the data to the specified path
            FILE *file = fopen(path, "w");
            if (file) {
                fprintf(file, "%s\n", data);
                fclose(file);
                g_print("Data saved to %s\n", path);
            } else {
                g_print("Error: Unable to open file at %s for writing\n", path);
            }
        } else {
            g_print("Error: No newline found in the message\n");
        }

        // Clean up
        g_free(message);
    } else {
        g_print("Unexpected message type\n");
    }
}

// Callback to handle messages from JavaScript
static void on_script_message_received_saveas(WebKitUserContentManager *manager,
                                              WebKitJavascriptResult *result,
                                              gpointer user_data) {
    // Extract the message as a string
    JSCValue *value = webkit_javascript_result_get_js_value(result);
    if (jsc_value_is_string(value)) {
        gchar *message = jsc_value_to_string(value);
        g_print("Received message from JavaScript: %s\n", message);

        // Find the position of the newline (\n) that separates the path from the data
        char *newline_pos = strchr(message, '\n');
        if (newline_pos) {
            // Null-terminate the path at the newline
            *newline_pos = '\0';
            const char *data = newline_pos + 1;   // Data is everything after the newline

            // Show GTK Save As dialog
            GtkWidget *dialog;
            GtkWindow *parent_window = GTK_WINDOW(user_data);  // Assuming user_data is a GtkWindow*
            dialog = gtk_file_chooser_dialog_new(
                "Save As",
                parent_window,
                GTK_FILE_CHOOSER_ACTION_SAVE,
                "_Cancel", GTK_RESPONSE_CANCEL,
                "_Save", GTK_RESPONSE_ACCEPT,
                NULL);

            // Set suggested filename
            gtk_file_chooser_set_current_name(GTK_FILE_CHOOSER(dialog), "untitled.txt");

            if (gtk_dialog_run(GTK_DIALOG(dialog)) == GTK_RESPONSE_ACCEPT) {
                char *path = gtk_file_chooser_get_filename(GTK_FILE_CHOOSER(dialog));
                g_print("Selected file: %s\n", path);

                // Save the data to the specified path
                FILE *file = fopen(path, "w");
                if (file) {
                    fprintf(file, "%s\n", data);
                    fclose(file);

                    // Extract the filename from the path
                    gchar *filename = g_path_get_basename(path);

                    // Create JavaScript command to update the editor
                    
                    char onlypath[ strlen( path ) - strlen( filename ) + 1 ];
                    snprintf( onlypath, sizeof( onlypath ), "%s", path );
                    
                    gchar *js_command = g_strdup_printf(
                        "setCurrentEditor( { path: '%s', filename: '%s' } );", 
                        onlypath, 
                        filename
                    );
                    printf( "Evaluating: %s\n", js_command );

                    // Evaluate JavaScript in the WebView
                    webkit_web_view_evaluate_javascript(
                        (WebKitWebView *)user_data, 
                        js_command, 
                        -1,  // -1 means the length is determined automatically
                        NULL, // world_name (NULL for default)
                        NULL, // source_uri (NULL for no source)
                        NULL, // cancellable (no cancelation)
                        NULL, // callback (no callback needed)
                        NULL  // user_data (no user data)
                    );

                    // Free allocated memory
                    g_free(js_command);
                    g_free(filename);

                    g_print("Data saved to %s\n", path);
                } else {
                    g_print("Error: Unable to open file at %s for writing\n", path);
                }

            } else {
                g_print("Save As dialog canceled\n");
            }

            gtk_widget_destroy(dialog);
        } else {
            g_print("Error: No newline found in the message\n");
        }

        // Clean up
        g_free(message);
    } else {
        g_print("Unexpected message type\n");
    }
}


int globalMessage = 1;

static void on_uri_scheme_request(WebKitURISchemeRequest *request, gpointer user_data) {
    // Get the WebKitWebView passed as user_data
    WebKitWebView *web_view = WEBKIT_WEB_VIEW(request);

    if (!web_view) {
        g_warning("WebKitWebView is NULL");
        return;
    }

    const gchar *uri = webkit_uri_scheme_request_get_uri(request);
    printf("Got a request: %s\n", uri);

    if (g_str_has_prefix(uri, "ihttp://")) {
        GError *error = NULL;

        // Extract the HTTP URL after "ihttp://"
        gchar *http_url = g_strndup(uri + strlen("ihttp://"), strlen(uri) - strlen("ihttp://"));
        gchar *host_port = http_url;
        gchar *path = strchr(http_url, '/');
        
        if (path) {
            *path = '\0';  // Separate host:port and path
            path++;        // Move past the '/'
        } else {
            path = "";     // No path, use empty string
        }

        gint port = 80;
        gchar *colon = strchr(host_port, ':');
        if (colon) {
            *colon = '\0';
            port = atoi(colon + 1);  // Get port number from the URL
        }

        printf("Host and port: %s\n", host_port);
        printf("Path: %s\n", path);

        // Get the raw HTTP request body
        GInputStream *body_input_stream = webkit_uri_scheme_request_get_http_body(request);
        GByteArray *body_data = g_byte_array_new();
        gchar buffer[1024];
        gssize bytes_read;

        // Read the body in chunks
        while ((bytes_read = g_input_stream_read(body_input_stream, buffer, sizeof(buffer), NULL, &error)) > 0) {
            g_byte_array_append(body_data, (const guint8 *)buffer, bytes_read);
        }

        if (error) {
            fprintf(stderr, "Error reading POST body: %s\n", error->message);
            g_error_free(error);
            g_byte_array_free(body_data, TRUE);
            g_free(http_url);
            return;
        }

        // Establish the TCP connection to the upstream server
        GSocketClient *client = g_socket_client_new();
        GSocketConnection *connection = g_socket_client_connect_to_host(client, host_port, port, NULL, &error);

        if (connection) {
            GOutputStream *output_stream = g_io_stream_get_output_stream(G_IO_STREAM(connection));
            GInputStream *input_stream = g_io_stream_get_input_stream(G_IO_STREAM(connection));

            // Create the HTTP request headers
            gchar *http_request = g_strdup_printf(
                "POST /%s HTTP/1.1\r\n"
                "Host: %s\r\n"
                "Content-Type: application/json\r\n"
                "Content-Length: %u\r\n"
                "Connection: close\r\n\r\n",
                path, host_port, body_data->len
            );

            printf("Sending request: %s\n", http_request);

            // Send the HTTP request headers
            if (g_output_stream_write(output_stream, http_request, strlen(http_request), NULL, &error) < strlen(http_request)) {
                fprintf(stderr, "Error sending HTTP headers: %s\n", error->message);
                g_error_free(error);
                g_free(http_request);
                g_byte_array_free(body_data, TRUE);
                return;
            }
            g_free(http_request);

            // Send the POST body
            if (body_data->len > 0) {
                if (g_output_stream_write(output_stream, body_data->data, body_data->len, NULL, &error) < body_data->len) {
                    fprintf(stderr, "Error sending POST body: %s\n", error->message);
                    g_error_free(error);
                    g_byte_array_free(body_data, TRUE);
                    return;
                }
            }
            g_byte_array_free(body_data, TRUE);

            // Stream the response back to WebKit in chunks
            ++globalMessage;
            while ((bytes_read = g_input_stream_read(input_stream, buffer, sizeof(buffer), NULL, &error)) > 0) {
                // Create a JavaScript command to send this chunk
                gchar *js_command = g_strdup_printf(
                    "handleStreamData('%d', '%s');",
                    globalMessage,
                    g_base64_encode(( unsigned char *)buffer, bytes_read)  // Base64 encode the chunk for safe JavaScript transfer
                );

                // Evaluate JavaScript in the WebView to handle the chunk
                webkit_web_view_evaluate_javascript((WebKitWebView *)user_data, 
                                                    js_command, 
                                                    -1,  // -1 means the length is determined automatically
                                                    NULL, // world_name (NULL for default)
                                                    NULL, // source_uri (NULL for no source)
                                                    NULL, // cancellable (no cancelation)
                                                    NULL, // callback (no callback needed)
                                                    NULL  // user_data (no user data)
                );
                g_free(js_command);
            }
            
            if (error) {
                fprintf(stderr, "Error reading response: %s\n", error->message);
                webkit_uri_scheme_request_finish_error(request, error);
                g_error_free(error);
            }
        } else {
            fprintf(stderr, "Error connecting to server: %s\n", error->message);
            webkit_uri_scheme_request_finish_error(request, error);
            g_error_free(error);
        }

        g_object_unref(client);
        g_free(http_url);

    } else {
        webkit_uri_scheme_request_finish_error(request, g_error_new_literal(G_IO_ERROR, G_IO_ERROR_NOT_SUPPORTED, "Unsupported URI"));
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
    
    printf( "Adding new view!\n" );
    
    gtk_window_set_title(GTK_WINDOW(view->window), "Aide");
    gtk_window_set_default_size(GTK_WINDOW(view->window), 1280, 800);

    // Create a vertical box layout
    GtkWidget *vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_container_add(GTK_CONTAINER(view->window), vbox);

    // Create a menu bar
    GtkWidget *menu_bar = gtk_menu_bar_new();

    // File menu
    GtkWidget *file_menu = gtk_menu_new();
    GtkWidget *file_menu_item = gtk_menu_item_new_with_label("File");
    gtk_menu_item_set_submenu(GTK_MENU_ITEM(file_menu_item), file_menu);

    GtkWidget *new_project = gtk_menu_item_new_with_label("New Project");
    GtkWidget *open_project = gtk_menu_item_new_with_label("Open Project");
    GtkWidget *close_project = gtk_menu_item_new_with_label("Close Project");
    GtkWidget *separator1 = gtk_separator_menu_item_new();
    GtkWidget *new_file = gtk_menu_item_new_with_label("New File");
    GtkWidget *open_file = gtk_menu_item_new_with_label("Open File");
    GtkWidget *close_file = gtk_menu_item_new_with_label("Close File");
    GtkWidget *separator2 = gtk_separator_menu_item_new();
    GtkWidget *quit = gtk_menu_item_new_with_label("Quit");

    gtk_menu_shell_append(GTK_MENU_SHELL(file_menu), new_project);
    gtk_menu_shell_append(GTK_MENU_SHELL(file_menu), open_project);
    gtk_menu_shell_append(GTK_MENU_SHELL(file_menu), close_project);
    gtk_menu_shell_append(GTK_MENU_SHELL(file_menu), separator1);
    gtk_menu_shell_append(GTK_MENU_SHELL(file_menu), new_file);
    gtk_menu_shell_append(GTK_MENU_SHELL(file_menu), open_file);
    gtk_menu_shell_append(GTK_MENU_SHELL(file_menu), close_file);
    gtk_menu_shell_append(GTK_MENU_SHELL(file_menu), separator2);
    gtk_menu_shell_append(GTK_MENU_SHELL(file_menu), quit);

    // Edit menu
    GtkWidget *edit_menu = gtk_menu_new();
    GtkWidget *edit_menu_item = gtk_menu_item_new_with_label("Edit");
    gtk_menu_item_set_submenu(GTK_MENU_ITEM(edit_menu_item), edit_menu);

    GtkWidget *cut = gtk_menu_item_new_with_label("Cut");
    GtkWidget *copy = gtk_menu_item_new_with_label("Copy");
    GtkWidget *paste = gtk_menu_item_new_with_label("Paste");
    GtkWidget *separator3 = gtk_separator_menu_item_new();
    GtkWidget *record_macro = gtk_menu_item_new_with_label("Record Macro");
    GtkWidget *store_macro = gtk_menu_item_new_with_label("Store Macro");
    GtkWidget *run_macro = gtk_menu_item_new_with_label("Run Macro");

    gtk_menu_shell_append(GTK_MENU_SHELL(edit_menu), cut);
    gtk_menu_shell_append(GTK_MENU_SHELL(edit_menu), copy);
    gtk_menu_shell_append(GTK_MENU_SHELL(edit_menu), paste);
    gtk_menu_shell_append(GTK_MENU_SHELL(edit_menu), separator3);
    gtk_menu_shell_append(GTK_MENU_SHELL(edit_menu), record_macro);
    gtk_menu_shell_append(GTK_MENU_SHELL(edit_menu), store_macro);
    gtk_menu_shell_append(GTK_MENU_SHELL(edit_menu), run_macro);

    // Settings menu
    GtkWidget *settings_menu = gtk_menu_new();
    GtkWidget *settings_menu_item = gtk_menu_item_new_with_label("Settings");
    gtk_menu_item_set_submenu(GTK_MENU_ITEM(settings_menu_item), settings_menu);

    GtkWidget *edit_settings = gtk_menu_item_new_with_label("Edit Settings");
    GtkWidget *load_settings = gtk_menu_item_new_with_label("Load Settings");
    GtkWidget *save_settings = gtk_menu_item_new_with_label("Save Settings");

    gtk_menu_shell_append(GTK_MENU_SHELL(settings_menu), edit_settings);
    gtk_menu_shell_append(GTK_MENU_SHELL(settings_menu), load_settings);
    gtk_menu_shell_append(GTK_MENU_SHELL(settings_menu), save_settings);

    // Add menus to the menu bar
    gtk_menu_shell_append(GTK_MENU_SHELL(menu_bar), file_menu_item);
    gtk_menu_shell_append(GTK_MENU_SHELL(menu_bar), edit_menu_item);
    gtk_menu_shell_append(GTK_MENU_SHELL(menu_bar), settings_menu_item);

    // Add menu bar to the layout
    gtk_box_pack_start(GTK_BOX(vbox), menu_bar, FALSE, FALSE, 0);

    // Create the WebView
    WebKitWebsiteDataManager *data_manager = webkit_website_data_manager_new(NULL);
    webkit_website_data_manager_set_tls_errors_policy(data_manager, WEBKIT_TLS_ERRORS_POLICY_IGNORE);
    view->webview = ( WebKitWebView *)webkit_web_view_new_with_context(webkit_web_context_new_with_website_data_manager(data_manager));
    if (!view->webview) {
        fprintf(stderr, "Failed to create WebKit WebView\n");
        gtk_widget_destroy(view->window); // Destroy the GTK window
        free(view); // Clean up memory
        return NULL;
    }

    // Set up settings for file access if not already done
    WebKitSettings *settings = webkit_web_view_get_settings(view->webview);
    webkit_settings_set_allow_file_access_from_file_urls(settings, TRUE);
    webkit_settings_set_auto_load_images(settings, TRUE);
    webkit_settings_set_enable_javascript(settings, TRUE);
    webkit_settings_set_enable_developer_extras(settings, TRUE);
    webkit_settings_set_disable_web_security(settings, TRUE);

    WebKitWebContext *web_context = webkit_web_context_get_default();
    g_object_set(web_context, "ssl-strict", FALSE, NULL);

    WebKitWebContext *context = webkit_web_context_get_default();
    webkit_web_context_register_uri_scheme(context, "ihttp", on_uri_scheme_request, view->webview, NULL);

    webkit_web_view_load_html(view->webview, "<html><body><h1>Hello, World!</h1></body></html>", NULL);
    gtk_box_pack_end(GTK_BOX(vbox), GTK_WIDGET(view->webview), TRUE, TRUE, 0);

    // Add event listeners (e.g., window close event)
    mlAddEvent((mlObject *)view, "closed", mlViewOnWindowClosed);

    // Automatically connect the "destroy" signal for the window
    g_signal_connect(G_OBJECT(view->window), "destroy", G_CALLBACK(mlViewOnWindowClosed), (gpointer)view);

    // Connect the key-press-event signal to the WebView
    g_signal_connect( G_OBJECT( view->window ), "key-press-event", G_CALLBACK( on_key_press_event ), ( gpointer )view->webview );

    // Create a WebKitUserContentManager
    WebKitUserContentManager *content_manager = webkit_web_view_get_user_content_manager(view->webview);

    // Connect for saving
    webkit_user_content_manager_register_script_message_handler( content_manager, "saveData" );
    webkit_user_content_manager_register_script_message_handler( content_manager, "saveAsData" );
    g_signal_connect(content_manager, "script-message-received::saveData", G_CALLBACK(on_script_message_received), ( gpointer )view->webview );
    g_signal_connect(content_manager, "script-message-received::saveAsData", G_CALLBACK(on_script_message_received_saveas), ( gpointer )view->webview );

    // Inject JavaScript to send messages
    const gchar *script = 
        "function saveData(data) {"
        "    console.log( \"Saving\", data ); window.webkit.messageHandlers.saveData.postMessage(data);"
        "};"
        "function saveAsData(data) {"
        "    console.log( \"Saving AS\", data ); window.webkit.messageHandlers.saveAsData.postMessage(data);"
        "}";
    WebKitUserScript *user_script = webkit_user_script_new(script,
       WEBKIT_USER_CONTENT_INJECT_ALL_FRAMES,
       WEBKIT_USER_SCRIPT_INJECT_AT_DOCUMENT_START,
       NULL, NULL);
    webkit_user_content_manager_add_script(content_manager, user_script);

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

    // Add accelerators (keyboard shortcuts)
    GtkAccelGroup *accel_group = gtk_accel_group_new();
    gtk_window_add_accel_group(GTK_WINDOW(view->window), accel_group);

    gtk_widget_add_accelerator(quit, "activate", accel_group, GDK_KEY_q, GDK_CONTROL_MASK, GTK_ACCEL_VISIBLE);
    gtk_widget_add_accelerator(new_project, "activate", accel_group, GDK_KEY_n, GDK_CONTROL_MASK, GTK_ACCEL_VISIBLE);
    gtk_widget_add_accelerator(open_project, "activate", accel_group, GDK_KEY_o, GDK_CONTROL_MASK, GTK_ACCEL_VISIBLE);
    gtk_widget_add_accelerator(save_settings, "activate", accel_group, GDK_KEY_s, GDK_CONTROL_MASK, GTK_ACCEL_VISIBLE);

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

