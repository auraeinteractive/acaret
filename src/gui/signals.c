#include "signals.h"

int globalMessage = 1;

void handle_signal(unsigned int signal, void *user_data)
{
    return;
}

// Some menu functions
void on_new_file(GtkWidget *widget, gpointer user_data )
{
    printf( "Tried to execute the new file..\n" );
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
}

void on_open_project(GtkWidget *widget, gpointer user_data )
{
    printf( "Tried to execute the open project..\n" );
    char *path = open_file_dialog( ( GtkWindow *)widget, 1 );
    if( path != NULL )
    {
        pass_project_to_js( ( WebKitWebView *)user_data, path );
        free( path );
    }
}

void on_open_file(GtkWidget *widget, gpointer user_data )
{
    printf( "Tried to execute the open file..\n" );
    char *path = open_file_dialog( ( GtkWindow *)widget, 0 );
    if( path != NULL )
    {
        pass_file_to_js( ( WebKitWebView *)user_data, path );
        free( path );
    }
}
void on_save_project(GtkWidget *widget, gpointer user_data )
{
    printf( "Tried to execute the new file..\n" );
    gchar *js_command = strdup( "saveProject( currentProject.path + currentProject.filename + '\\n' + JSON.stringify(currentProject) );" );
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
void on_save_project_as(GtkWidget *widget, gpointer user_data )
{
    printf( "Tried to execute the new file..\n" );
    gchar *js_command = strdup( "saveProjectAs( currentProject.path + currentProject.filename + '\\n' + JSON.stringify(currentProject) );" );
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
void on_save_file(GtkWidget *widget, gpointer user_data )
{
    printf( "Tried to execute the new file..\n" );
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
}
void on_save_file_as(GtkWidget *widget, gpointer user_data )
{
    printf( "Tried to execute the new file..\n" );
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
}

void on_close_file(GtkWidget *widget, gpointer user_data )
{
    printf( "Tried to execute close file..\n" );
    gchar *js_command = strdup( "closeFile( currentEditor );" );
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

void on_close_file_all(GtkWidget *widget, gpointer user_data )
{
    printf( "Tried to execute close all files..\n" );
    gchar *js_command = strdup( "closeFileAll();" );
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

void on_load_file_by_path(
    WebKitUserContentManager *user_content_manager,
    WebKitJavascriptResult *result,
    gpointer user_data
)
{
    GError *error = NULL;
    JSCValue *value = webkit_javascript_result_get_js_value(result);
    if (error != NULL) {
        g_printerr("JavaScript error: %s\n", error->message);
        g_error_free(error);
        return;
    }

    // Handle the response as needed
    gchar *message = jsc_value_to_string(value);
    g_print("Received script path: %s\n", message);

    // Check for specific messages and handle them accordingly

    char *file_content = read_file_content( message );
    if( file_content )
    {
        char *encoded_content = g_base64_encode( ( const guchar * )file_content, strlen( file_content ) );
        const char *filename = g_path_get_basename( message );
        const char *dir_path = g_path_get_dirname( message );

        char *js_command = g_strdup_printf(
            "loadFile(`%s`, \"%s\", \"%s\");",
            encoded_content,
            dir_path,
            filename
        );
        
        // Evaluate JavaScript in the Web View to handle the chunk
        webkit_web_view_evaluate_javascript((WebKitWebView *)user_data, 
                                            js_command, 
                                            -1,  // -1 means the length is determined automatically
                                            NULL, // world_name (NULL for default)
                                            NULL, // source_uri (NULL for no source)
                                            NULL, // cancellable (no cancelation)
                                            NULL, // callback (no callback needed)
                                            NULL  // user_data (no user data)
        );
        printf( "Freeing js command %s\n", js_command );
        g_free(js_command);
        printf( "Freeing file content\n" );
        free( file_content );
    }
    
    printf( "Freeing message\n" );
    free( message );
    printf( "Done.\n" );
}

// Callback to handle resource loading failures
void on_resource_failed(WebKitWebResource *resource, GError *error, gpointer user_data) {
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
void pass_project_to_js(WebKitWebView *webview, const char *file_path) 
{
    char *file_content = read_file_content(file_path);
    if (!file_content) {
        printf( "No file to open.\n" );
        return; // Exit if file could not be read
    }

    // Extract filename from the path

    char *encoded_content = g_base64_encode( ( const guchar * )file_content, strlen( file_content ) );
    const char *filename = g_path_get_basename( file_path );
    const char *dir_path = g_path_get_dirname( file_path );

    // Create the JavaScript command
    char *js_command = g_strdup_printf("loadProject(`%s`, \"%s\", \"%s\");",
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
char *open_file_dialog(GtkWindow *parent, int type ) {
    GtkWidget *dialog;
    char *filename = NULL;

    char *typeStr = NULL;
    switch( type )
    {
        case 1:
            typeStr = strdup( "Open Project" );
            break;
        default:
            typeStr = strdup( "Open File" );
            break;
    }

    // Create a file chooser dialog
    dialog = gtk_file_chooser_dialog_new( typeStr,
                                         parent,
                                         GTK_FILE_CHOOSER_ACTION_OPEN,
                                         "_Cancel", GTK_RESPONSE_CANCEL,
                                         "_Open", GTK_RESPONSE_ACCEPT,
                                         NULL);

    free( typeStr );
    
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

// Function to read directory contents and return a GPtrArray of JSON strings
GPtrArray *read_directory(const gchar *path)
{
    GPtrArray *array = g_ptr_array_new_with_free_func(g_free);
    DIR *dir;
    struct dirent *ent;

    if ((dir = opendir(path)) != NULL) {
        while ((ent = readdir(dir)) != NULL) {
            if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) {
                continue; // Skip '.' and '..'
            }
            gchar *entry_path = g_build_filename(path, ent->d_name, NULL);
            struct stat file_stat;
            if (stat(entry_path, &file_stat) == 0) {
                // Remove the trailing newline from ctime
                char *date_str = ctime(&file_stat.st_mtime);
                date_str[strlen(date_str) - 1] = '\0';
                char *mod_str = ctime(&file_stat.st_ctime);
                mod_str[strlen(mod_str) - 1] = '\0';

                // Determine if it's a file or directory
                const gchar *type = S_ISDIR(file_stat.st_mode) ? "dir" : "file";

                gchar *json_entry = g_strdup_printf("{\"name\":\"%s\", \"size\":%ld, \"date\":\"%s\", \"mod\":\"%s\", \"type\":\"%s\"}",
                                                   ent->d_name,
                                                   file_stat.st_size,
                                                   date_str,
                                                   mod_str,
                                                   type);
                g_ptr_array_add(array, json_entry);
            } else {
                g_print("Failed to get stats for %s\n", entry_path);
            }
            g_free(entry_path);
        }
        closedir(dir);
    } else {
        g_print("Failed to open directory: %s\n", path);
        return NULL;
    }

    return array;
}

// Function to handle script messages
void on_script_message_received_folders(
    WebKitUserContentManager *user_content_manager,
    WebKitJavascriptResult *result,
    gpointer user_data
)
{
    GError *error = NULL;
    JSCValue *value = webkit_javascript_result_get_js_value( result );
    if (error != NULL) {
        g_printerr("JavaScript error: %s\n", error->message);
        g_error_free(error);
        return;
    }

    // Handle the response as needed
    gchar *message = jsc_value_to_string(value);
    g_print("Received script message: %s\n", message);

    // Check for specific messages and handle them accordingly

    refresh_folder_structure( message, user_data);
    
    free( message );
}

// Function to refresh folder structure
void refresh_folder_structure( gchar *path, gpointer user_data )
{
    WebKitWebView *webview = WEBKIT_WEB_VIEW(user_data);
    
    g_print("Handling path: %s\n", path);

    GPtrArray *files_array = read_directory(path);

    if (files_array != NULL) {
        
        GString *json_string = g_string_new("receiveFolders(\"");
        g_string_append( json_string, path );
        g_string_append( json_string, "\"," );
        g_string_append( json_string, "[" );
        for (guint i = 0; i < files_array->len; i++) {
            if (i > 0) {
                g_string_append(json_string, ", ");
            }
            g_string_append(json_string, g_ptr_array_index(files_array, i));
        }
        g_string_append(json_string, "])");

        // Send the JSON string back to JavaScript
        webkit_web_view_evaluate_javascript(
                        webview, 
                        json_string->str, 
                        -1,  // -1 means the length is determined automatically
                        NULL, // world_name (NULL for default)
                        NULL, // source_uri (NULL for no source)
                        NULL, // cancellable (no cancelation)
                        NULL, // callback (no callback needed)
                        NULL  // user_data (no user data)
                    );
       
        g_print( "Just handling output: %s\n", json_string->str );
       
        g_string_free(json_string, TRUE);
        g_ptr_array_unref(files_array);
    } else {
        g_print("Failed to read directory\n");
    }
}

// Tag: General messages

// Callback to handle messages from JavaScript
void on_script_message(
    WebKitUserContentManager *manager,
    WebKitJavascriptResult *result,
    gpointer user_data
)
{
    // Extract the message as a string
    JSCValue *value = webkit_javascript_result_get_js_value(result);
    if( jsc_value_is_string( value ) )
    {
        gchar *message = jsc_value_to_string( value );
        gchar *js_command = NULL;

        // Find the position of the first occurrence of '\n'
        char *newline = strchr( message, '\n' );
        if( newline != NULL )
        {
            // Extract callbackId
            *newline = '\0'; // Null-terminate the string at the newline character
            
            char *callbackId = message;

            // Extract data
            char *data = newline + 1;
            
            // Extract instruction command from the input string
            char *instructionCommand = strtok( data, "\n" );
            if( instructionCommand == NULL )
            {
                fprintf(stderr, "Invalid input format.\n");
            }
            else
            {
                if( strcmp( instructionCommand, "help" ) == 0 )
                {
                    printf( "Executing command (soon): %s with %s\n", instructionCommand, data + ( strlen( instructionCommand ) + 1 )  );
                }
                else if( strcmp( instructionCommand, "file-new" ) == 0 )
                {
                    printf( "Executing command (soon): %s with %s\n", instructionCommand, data + ( strlen( instructionCommand ) + 1 )  );
                }
                else if( strcmp( instructionCommand, "folder-new" ) == 0 )
                {
                    printf( "Executing command (soon): %s with %s\n", instructionCommand, data + ( strlen( instructionCommand ) + 1 )  );
                }
                else
                {
                    printf( "Unsupported command: %s\n", instructionCommand );
                }
            }
            
            js_command = g_strdup_printf(
                "window.executeSignalCallback( %s, false );", 
                callbackId
            );
            // When we get data!:
            /*js_command = g_strdup_printf(
                "window.executeSignalCallback( %s, \"%s\" );", 
                callbackId, 
                g_base64_encode( ( const guchar * )data, strlen( data ) )
            );*/
        }
        else 
        {
            g_printerr("Invalid message format: missing newline character\n");
        }
        
        if( js_command != NULL )
        {
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
        }

        // Clean up
        g_free( message );
    }
    else
    {
        g_print("Unexpected message type\n");
    }
}

// Tag: Actions like writing to disk

// Callback to handle messages from JavaScript
void on_script_message_received(WebKitUserContentManager *manager,
                                        WebKitJavascriptResult *result,
                                        gpointer user_data)
{
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
                fprintf(file, strlen( data ) > 0 ? "%s" : "\n", data); // Empty files write with newline
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
void on_script_message_received_project(WebKitUserContentManager *manager,
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
                return on_script_message_received_saveas_project( manager, result, user_data );
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

// Callback to handle save as project from js
void on_script_message_received_saveas_project(WebKitUserContentManager *manager,
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
            gtk_file_chooser_set_current_name(GTK_FILE_CHOOSER(dialog), "untitled.acaret");

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
                        "setCurrentProject( { path: '%s', filename: '%s' } );", 
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

// Callback to handle messages from JavaScript
void on_script_message_received_saveas(WebKitUserContentManager *manager,
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

void on_uri_scheme_request(WebKitURISchemeRequest *request, gpointer user_data) {
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

gboolean script_dialog_cb(WebKitWebView *web_view, WebKitScriptDialog *dialog, gpointer user_data) {
    // Get the message from the dialog
    const gchar *message = webkit_script_dialog_get_message(dialog);
    printf("Dialog message: %s\n", message);

    // Get the title of the current web page
    const gchar *page_title = webkit_web_view_get_title(web_view);
    printf("Page title: %s\n", page_title);

    // Get the dialog type directly (no arguments needed for this function)
    WebKitScriptDialogType dialog_type = webkit_script_dialog_get_dialog_type(dialog);
    printf("Dialog type value: %d\n", dialog_type);
    printf("WEBKIT_SCRIPT_DIALOG_ALERT = %d\n", WEBKIT_SCRIPT_DIALOG_ALERT);
    printf("WEBKIT_SCRIPT_DIALOG_CONFIRM = %d\n", WEBKIT_SCRIPT_DIALOG_CONFIRM);

    // Handle alert dialog
    if (dialog_type == WEBKIT_SCRIPT_DIALOG_ALERT) {
        printf("Handling alert dialog\n");

        GtkWidget *dialog_box = gtk_message_dialog_new(GTK_WINDOW(user_data),
                                                       GTK_DIALOG_MODAL,
                                                       GTK_MESSAGE_INFO,
                                                       GTK_BUTTONS_OK,
                                                       "%s\n\n%s", page_title, message);

        // Run the dialog
        gtk_dialog_run(GTK_DIALOG(dialog_box));

        // Destroy the dialog after it's closed
        gtk_widget_destroy(dialog_box);
        printf("Alert dialog handled and destroyed\n");
    }
    // Handle confirm dialog
    else if (dialog_type == WEBKIT_SCRIPT_DIALOG_CONFIRM) {
        printf("Handling confirm dialog\n");

        // Create a message dialog with no default buttons
        GtkWidget *dialog_box = gtk_message_dialog_new(GTK_WINDOW(user_data),
                                                       GTK_DIALOG_MODAL,
                                                       GTK_MESSAGE_QUESTION,
                                                       GTK_BUTTONS_NONE,
                                                       "%s\n\n%s", page_title, message);

        // Explicitly add "Yes" and "No" buttons with appropriate response codes
        gtk_dialog_add_buttons(GTK_DIALOG(dialog_box),
                               "Yes", GTK_RESPONSE_YES,
                               "No", GTK_RESPONSE_NO,
                               NULL);

        // Run the dialog and capture the response
        gint response = gtk_dialog_run(GTK_DIALOG(dialog_box));

        // Determine whether the user clicked "Yes" or "No"
        gboolean result = (response == GTK_RESPONSE_YES);

        // Debugging response
        printf("User response: %s\n", result ? "Yes" : "No");

        // Set the confirmed result using WebKit's function
        webkit_script_dialog_confirm_set_confirmed(dialog, result);

        // Destroy the dialog after it's closed
        gtk_widget_destroy(dialog_box);
        printf("Confirm dialog handled and destroyed\n");

        // Return TRUE to indicate that we handled the dialog
        return TRUE;
    }

    // Return TRUE to suppress the default dialog and allow custom handling
    return TRUE;
}

gboolean on_key_press_event(GtkWidget *widget, GdkEventKey *event, gpointer user_data) {
    if( ( event->state & GDK_CONTROL_MASK ) && event->keyval == GDK_KEY_o ){
        on_open_file( widget, user_data );
        return TRUE;
    }
    // Check if Ctrl+N is pressed
    else if( 
        ( event->state & GDK_CONTROL_MASK )
        && event->keyval == GDK_KEY_n
    )
    {
        g_print("Ctrl+N detected. New file triggered.\n");
        on_new_file( widget, user_data );
        
        return TRUE; // Stop further handling of this event
    }
    // Check if Ctrl+Shift +S is pressed
    else if( 
        ( event->state & ( GDK_CONTROL_MASK | GDK_SHIFT_MASK ) ) == ( GDK_CONTROL_MASK | GDK_SHIFT_MASK ) 
        && event->keyval == GDK_KEY_S
    )
    {
        g_print("Ctrl+Shift+S detected. Save AS action triggered.\n");
        on_save_file_as( widget, user_data );
        
        return TRUE; // Stop further handling of this event
    }
    // Check if Ctrl+S is pressed
    else if ((event->state & GDK_CONTROL_MASK) && event->keyval == GDK_KEY_s) {
        g_print("Ctrl+S detected. Save action triggered.\n");
        on_save_file( widget, user_data );
        
        return TRUE; // Stop further handling of this event
    }
    // Check if Ctrl+shift+w is pressed
    else if (
        ( event->state & ( GDK_CONTROL_MASK | GDK_SHIFT_MASK ) ) == ( GDK_CONTROL_MASK | GDK_SHIFT_MASK )
        && event->keyval == GDK_KEY_w) 
    {
        g_print("Ctrl+Shift+W detected. Close action triggered.\n");
        on_close_file_all( widget, user_data );
        
        return TRUE; // Stop further handling of this event
    }
    // Check if Ctrl+w is pressed
    else if ((event->state & GDK_CONTROL_MASK) && event->keyval == GDK_KEY_w) {
        g_print("Ctrl+W detected. Close action triggered.\n");
        on_close_file( widget, user_data );
        
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
char* convertDataURLToLocalPath( const char* cwd, const char* relative_path )
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




