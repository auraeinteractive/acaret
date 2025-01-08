#include "view.h"

void mlViewOnWindowClosed(void *instance, void *data);

// Updated method to set HTML content from a file
void mlViewSetHTML(void *instance, void *data) {
    mlView *view = (mlView *)instance;
    char *filename = (char *)data;  // Use this if needed, otherwise remove
    
    // Get the executable's directory
    char exe_path[PATH_MAX];
    ssize_t len = readlink("/proc/self/exe", exe_path, sizeof(exe_path) - 1);
    if (len == -1) {
        fprintf(stderr, "Failed to get executable path.\n");
        return;
    }
    exe_path[len] = '\0';  // Null-terminate the string
    char *dir = dirname(exe_path);  // Get the directory of the executable

    // Allocate memory for the full path
    char *path = malloc(PATH_MAX + strlen(filename) + 1);
    if (!path) {
        fprintf(stderr, "Failed to allocate memory for path.\n");
        return;
    }

    // Construct the path
    if (snprintf(path, PATH_MAX + strlen(filename) + 1, "%s/assets/%s", dir, filename) < 0) {
        fprintf(stderr, "snprintf failed\n");
        free(path);
        return;
    }

    // Open the file
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

    char *content = calloc( 1, size + 1 );
    if( !content )
    {
        fprintf( stderr, "Failed to allocate memory for file content\n" );
        fclose( file );
        free( path );
        return;
    }
    
    printf(" > Now parsing markup.\n");
    fread( content, 1, size, file );
    content[size] = '\0';

    char *modified_content = strdup( content );
    if( !modified_content )
    {
        fprintf( stderr, "Failed to allocate memory for modified content\n" );
        free( content );
        fclose( file );
        free( path );
        return;
    }

    char *start = modified_content;
    while( start && *start )
    {
        char *data_start = strstr(start, "data://");
        if (!data_start) break;

        char *end = strchr(data_start, '"');
        if( !end )
        {
            fprintf(stderr, "Malformed data URL: missing closing quote.\n");
            break;
        }
        
        *end = '\0';  // Null-terminate the string to get the relative path
        char *relative_path = data_start + strlen("data://");
        char *full_path = convertDataURLToLocalPath(dir, relative_path);
        if( !full_path )
        {
            fprintf(stderr, "Failed to convert data URL to local path.\n");
            break;
        }

        // Calculate new length
        size_t prefix_length = data_start - modified_content;
        size_t new_length = prefix_length + strlen("file://") + strlen(full_path) + 2 + strlen(end + 1); // +2 for closing quote and null terminator
        char *new_content = malloc(new_length);
        if( !new_content )
        {
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
        if( resource )
        {
            g_signal_connect(resource, "failed", G_CALLBACK(on_resource_failed), NULL);
        }

        free(modified_content);
    }

    free( content );
    fclose( file );
    free( path );
}

// Method to set the size of the view
void mlViewSetSize( void *instance, void *data )
{
    mlView *view = (mlView *)instance;
    int *size = (int *)data;
    printf("Setting view size to %dx%d\n", size[0], size[1]);
    gtk_window_resize(GTK_WINDOW(view->window), size[0], size[1]);
}

// Show the view (make it visible)
void mlViewShow( void *instance, void *data )
{
    mlView *view = (mlView *)instance;
    printf("Showing view\n");
    gtk_widget_show_all(view->window);
}

// Handle the window close event
void mlViewOnWindowClosed( void *instance, void *data )
{
    printf("[mlViewOnWindowClosed] Window closed.\n");
    if( instance != NULL )
    {  // Check if the instance is still valid
        printf( "[mlViewOnWindowClosed] Triggering \"closed\" event\n" );
        mlTriggerEvent( (mlObject *)instance, "closed", NULL );
        printf( "[mlViewOnWindowClosed] Event triggered.\n" );
    }
}

void on_script_message_received_saveas(WebKitUserContentManager *manager,
                                              WebKitJavascriptResult *result,
                                              gpointer user_data);

// Create a new view (this function should be called from the main program)
mlObject *mlViewCreate(mlObject *parent) {
    // Dynamically create the derived mlView object
    mlView *view = (mlView *)mlObjectCreateWithSize( sizeof( mlObject ), sizeof( mlView ), parent );
    if( !view )
    {
        fprintf( stderr, "Failed to create mlView object\n" );
        return NULL;
    }

    // Initialize GTK window
    view->window = gtk_window_new( GTK_WINDOW_TOPLEVEL );
    if( !view->window )
    {
        fprintf( stderr, "Failed to create GTK window\n" );
        free( view ); // Clean up memory
        return NULL;
    }
    
    // Get the executable's directory
    char exe_path[ PATH_MAX ];
    ssize_t len = readlink("/proc/self/exe", exe_path, sizeof(exe_path) - 1);
    if( len == -1 )
    {
        fprintf( stderr, "Failed to get executable path.\n" );
        return NULL;
    }
    exe_path[len] = '\0';  // Null-terminate the string
    char *dir = dirname( exe_path );  // Get the directory of the executable

    // Construct the path to the icon file
    char *icon_path = malloc( PATH_MAX + strlen( dir ) + strlen( "/icon_128.png" ) + 1 );
    if( !icon_path )
    {
        fprintf( stderr, "Failed to allocate memory for icon path.\n" );
        return NULL;
    }

    snprintf(icon_path, PATH_MAX + strlen(dir) + strlen("/icon_128.png") + 1, "%s/icon_128.png", dir);
    
    // Set the window icon
    GdkPixbuf *icon = gdk_pixbuf_new_from_file(icon_path, NULL);
    if (icon) {
        fprintf(stderr, "Loaded icon: %s\n", icon_path);
        gtk_window_set_icon(GTK_WINDOW(view->window), icon);
    } else {
        fprintf(stderr, "Failed to load icon: %s\n", icon_path);
    }

    // Clean up
    free(icon_path);
    
    gtk_window_set_title( GTK_WINDOW( view->window ), "Acaret" );
    gtk_window_set_default_size(GTK_WINDOW(view->window), 1280, 800);

    // Create a vertical box layout
    GtkWidget *vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_container_add(GTK_CONTAINER(view->window), vbox);

    // Tag: Set up window menu

    // Create a menu bar
    GtkWidget *menu_bar = gtk_menu_bar_new();

    // File menu
    GtkWidget *file_menu = gtk_menu_new();
    GtkWidget *file_menu_item = gtk_menu_item_new_with_label("File");
    gtk_menu_item_set_submenu(GTK_MENU_ITEM(file_menu_item), file_menu);

    GtkWidget *new_project = gtk_menu_item_new_with_label("New Project");
    GtkWidget *open_project = gtk_menu_item_new_with_label("Open Project");
    GtkWidget *save_project = gtk_menu_item_new_with_label("Save Project");
    GtkWidget *save_project_as = gtk_menu_item_new_with_label("Save Project As");
    GtkWidget *close_project = gtk_menu_item_new_with_label("Close Project");
    GtkWidget *separator1 = gtk_separator_menu_item_new();
    GtkWidget *new_file = gtk_menu_item_new_with_label("New");
    GtkWidget *open_file = gtk_menu_item_new_with_label("Open");
    GtkWidget *save_file = gtk_menu_item_new_with_label("Save");
    GtkWidget *save_file_as = gtk_menu_item_new_with_label("Save As");
    GtkWidget *close_file = gtk_menu_item_new_with_label("Close");
    GtkWidget *close_file_all = gtk_menu_item_new_with_label("Close all");
    GtkWidget *separator2 = gtk_separator_menu_item_new();
    GtkWidget *quit = gtk_menu_item_new_with_label("Quit");
    
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), new_project );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), open_project );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), save_project );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), save_project_as );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), close_project );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), separator1 );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), new_file );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), open_file );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), save_file );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), save_file_as );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), close_file );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), close_file_all );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), separator2 );
    gtk_menu_shell_append( GTK_MENU_SHELL( file_menu ), quit );

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
    GtkWidget *settings_menu_item = gtk_menu_item_new_with_label( "Settings" );
    gtk_menu_item_set_submenu( GTK_MENU_ITEM( settings_menu_item ), settings_menu );

    GtkWidget *edit_settings = gtk_menu_item_new_with_label( "Edit Settings" );
    GtkWidget *load_settings = gtk_menu_item_new_with_label( "Load Settings" );
    GtkWidget *save_settings = gtk_menu_item_new_with_label( "Save Settings" );
    GtkWidget *separator_settings = gtk_separator_menu_item_new();
    GtkWidget *about_acaret = gtk_menu_item_new_with_label( "About Acaret v0.1a" );

    gtk_menu_shell_append(GTK_MENU_SHELL(settings_menu), edit_settings);
    gtk_menu_shell_append(GTK_MENU_SHELL(settings_menu), load_settings);
    gtk_menu_shell_append(GTK_MENU_SHELL(settings_menu), save_settings);
    gtk_menu_shell_append(GTK_MENU_SHELL(settings_menu), separator_settings);
    gtk_menu_shell_append(GTK_MENU_SHELL(settings_menu), about_acaret);

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
    if( !view->webview )
    {
        fprintf( stderr, "Failed to create WebKit WebView\n" );
        gtk_widget_destroy( view->window ); // Destroy the GTK window
        free( view ); // Clean up memory
        return NULL;
    }

    g_signal_connect( open_project, "activate", G_CALLBACK(on_open_project), ( gpointer )view->webview);
    g_signal_connect( save_project, "activate", G_CALLBACK(on_save_project), ( gpointer )view->webview);
    g_signal_connect( save_project_as, "activate", G_CALLBACK(on_save_project_as), ( gpointer )view->webview);
    
    g_signal_connect( new_file, "activate", G_CALLBACK(on_new_file), ( gpointer )view->webview);
    g_signal_connect( open_file, "activate", G_CALLBACK(on_open_file), ( gpointer )view->webview);
    g_signal_connect( save_file, "activate", G_CALLBACK(on_save_file), ( gpointer )view->webview);
    g_signal_connect( save_file_as, "activate", G_CALLBACK(on_save_file_as), ( gpointer )view->webview);
    g_signal_connect( close_file, "activate", G_CALLBACK(on_close_file), ( gpointer )view->webview);
    g_signal_connect( close_file_all, "activate", G_CALLBACK(on_close_file_all), ( gpointer )view->webview);
    g_signal_connect( quit, "activate", G_CALLBACK(doQuit), ( gpointer )view->webview);

    // Set up settings for file access if not already done
    WebKitSettings *settings = webkit_web_view_get_settings( view->webview );
    webkit_settings_set_allow_file_access_from_file_urls(settings, TRUE);
    webkit_settings_set_auto_load_images(settings, TRUE);
    webkit_settings_set_enable_javascript(settings, TRUE);
    webkit_settings_set_enable_developer_extras(settings, TRUE);
    webkit_settings_set_disable_web_security(settings, TRUE);

    WebKitWebContext *web_context = webkit_web_context_get_default();
    g_object_set(web_context, "ssl-strict", FALSE, NULL);

    WebKitWebContext *context = webkit_web_context_get_default();
    webkit_web_context_register_uri_scheme(context, "ihttp", on_uri_scheme_request, view->webview, NULL);

    webkit_web_view_load_html(view->webview, "<html><head><title>Acursor</title></head><body></body></html>", NULL);
    gtk_box_pack_end(GTK_BOX(vbox), GTK_WIDGET(view->webview), TRUE, TRUE, 0);

    // Automatically connect the "destroy" signal for the window
    g_signal_connect(G_OBJECT(view->window), "destroy", G_CALLBACK(doQuit), (gpointer)view);

    // Connect the key-press-event signal to the WebView
    g_signal_connect( G_OBJECT( view->window ), "key-press-event", G_CALLBACK( on_key_press_event ), ( gpointer )view->webview );

    // Create a WebKitUserContentManager
    WebKitUserContentManager *content_manager = webkit_web_view_get_user_content_manager( view->webview );

    // Connect for saving
    webkit_user_content_manager_register_script_message_handler( content_manager, "saveData" );
    webkit_user_content_manager_register_script_message_handler( content_manager, "saveAsData" );
    g_signal_connect(content_manager, "script-message-received::saveData", G_CALLBACK(on_script_message_received), ( gpointer )view->webview );
    g_signal_connect(content_manager, "script-message-received::saveAsData", G_CALLBACK(on_script_message_received_saveas), ( gpointer )view->webview );
    
    // Connect for sacving project
    webkit_user_content_manager_register_script_message_handler( content_manager, "saveProject" );
    webkit_user_content_manager_register_script_message_handler( content_manager, "saveProjectAs" );
    g_signal_connect(content_manager, "script-message-received::saveProject", G_CALLBACK(on_script_message_received_project), ( gpointer )view->webview );
    g_signal_connect(content_manager, "script-message-received::saveProjectAs", G_CALLBACK(on_script_message_received_saveas_project), ( gpointer )view->webview );

    // Inject JavaScript to send messages
    const gchar *script = 
        "function saveData(data) {"
        "    console.log( \"Saving\", data );"
        "    window.webkit.messageHandlers.saveData.postMessage(data);"
        "    currentEditor.document_saved = true;"
        "    updateBottomBar();"
        "};"
        "function saveAsData(data) {"
        "    console.log( \"Saving AS\", data );"
        "    window.webkit.messageHandlers.saveAsData.postMessage(data);"
        "    currentEditor.document_saved = true;"
        "    updateBottomBar();"
        "};"
        "function saveProject(data) {"
        "    console.log( \"Saving\", data );"
        "    window.webkit.messageHandlers.saveProject.postMessage(data);"
        "    currentEditor.project_saved = true;"
        "    updateBottomBar();"
        "};"
        "function saveProjectAs(data) {"
        "    console.log( \"Saving AS\", data );"
        "    window.webkit.messageHandlers.saveProjectAs.postMessage(data);"
        "    currentEditor.project_saved = true;"
        "    updateBottomBar();"
        "};"
        "function refreshFolderStructure(path) {"
        "    console.log( \"Getting path: \", path );"
        "    window.webkit.messageHandlers.refreshFolderStructure.postMessage(path);"
        "};"
        "function loadFileFromPath( path ) {"
        "    console.log( \"Getting path: \", path );"
        "    window.webkit.messageHandlers.loadFileFromPath.postMessage( path );"
        "};";
    WebKitUserScript *user_script = webkit_user_script_new(script,
       WEBKIT_USER_CONTENT_INJECT_ALL_FRAMES,
       WEBKIT_USER_SCRIPT_INJECT_AT_DOCUMENT_START,
       NULL, NULL);
    webkit_user_content_manager_add_script(content_manager, user_script);

    // Handle folders
    webkit_user_content_manager_register_script_message_handler( content_manager, "refreshFolderStructure" );
    g_signal_connect(content_manager, "script-message-received::refreshFolderStructure",
                     G_CALLBACK( on_script_message_received_folders ), view->webview);
    // Handle load file from path
    webkit_user_content_manager_register_script_message_handler( content_manager, "loadFileFromPath" );
    g_signal_connect(content_manager, "script-message-received::loadFileFromPath",
                     G_CALLBACK( on_load_file_by_path ), view->webview);
    
    // Connect to the script-dialog signal to handle alert, confirm, etc.
    g_signal_connect( view->webview, "script-dialog", G_CALLBACK(script_dialog_cb), NULL );
    
    // Set the method table for the view
    // TODO: Make this prettier
    mlMethodEntry *method_table = malloc( sizeof( mlMethodEntry ) * 3 );
    if( method_table )
    {
        method_table[ 0 ] = ( mlMethodEntry ){ "setSize", mlViewSetSize };
        method_table[ 1 ] = ( mlMethodEntry ){ "show", mlViewShow };
        method_table[ 2 ] = ( mlMethodEntry ){ "setHTML", mlViewSetHTML };
        view->base.method_table = method_table;
        view->base.method_count = 3;
    }
    else
    {
        fprintf( stderr, "Failed to allocate memory for method table\n" );
        gtk_widget_destroy( view->window );
        free( view );
        return NULL;
    }

    // Add accelerators (keyboard shortcuts)
    GtkAccelGroup *accel_group = gtk_accel_group_new();
    gtk_window_add_accel_group( GTK_WINDOW( view->window ), accel_group );

    // Tag: Menu keyboard shortcuts
    gtk_widget_add_accelerator( quit, "activate", accel_group, GDK_KEY_q, GDK_CONTROL_MASK, GTK_ACCEL_VISIBLE);
    gtk_widget_add_accelerator( new_file, "activate", accel_group, GDK_KEY_n, GDK_CONTROL_MASK, GTK_ACCEL_VISIBLE);
    gtk_widget_add_accelerator( open_file, "activate", accel_group, GDK_KEY_o, GDK_CONTROL_MASK, GTK_ACCEL_VISIBLE);
    gtk_widget_add_accelerator( open_project, "activate", accel_group, GDK_KEY_o, ( GDK_CONTROL_MASK | GDK_SHIFT_MASK ), GTK_ACCEL_VISIBLE);
    gtk_widget_add_accelerator( save_file, "activate", accel_group, GDK_KEY_s, GDK_CONTROL_MASK, GTK_ACCEL_VISIBLE);
    gtk_widget_add_accelerator( save_file_as, "activate", accel_group, GDK_KEY_s, ( GDK_CONTROL_MASK | GDK_SHIFT_MASK ), GTK_ACCEL_VISIBLE);
    gtk_widget_add_accelerator( close_file, "activate", accel_group, GDK_KEY_w, GDK_CONTROL_MASK, GTK_ACCEL_VISIBLE);
    gtk_widget_add_accelerator( close_file_all, "activate", accel_group, GDK_KEY_w, ( GDK_CONTROL_MASK | GDK_SHIFT_MASK ), GTK_ACCEL_VISIBLE);

    return (mlObject *)view;
}


// Destroy a view object and free resources
void mlViewDestroy( mlObject *obj )
{
    if (!obj) return;

    mlView *view = ( mlView * )obj;
    if( !view ) return;

    // Destroy the GTK window if it exists
    if( view->window )
    {
        gtk_widget_destroy( view->window );
    }

    // Call the base destroy function to clean up common resources
    mlObjectDestroy( obj );
}

