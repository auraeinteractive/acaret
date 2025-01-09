// signals.h
#ifndef SIGNALS_H
#define SIGNALS_H

#include <gtk/gtk.h>
#include <stdio.h>
#include <stdlib.h>
#include <webkit2/webkit2.h>
#include <gtk/gtk.h>
#include <sys/stat.h>
#include "../oop/base.h"

void doQuit();
void handle_signal(unsigned int signal, void *user_data);
char* convertDataURLToLocalPath( const char* cwd, const char* relative_path );
char *open_file_dialog(GtkWindow *parent, int type );
char *read_file_content(const char *file_path);
void pass_file_to_js(WebKitWebView *webview, const char *file_path);
void pass_project_to_js(WebKitWebView *webview, const char *file_path);
void on_new_file(GtkWidget *widget, gpointer user_data );
void on_open_project(GtkWidget *widget, gpointer user_data );
void on_open_file(GtkWidget *widget, gpointer user_data );
void on_save_project(GtkWidget *widget, gpointer user_data );
void on_save_project_as(GtkWidget *widget, gpointer user_data );
void on_close_file(GtkWidget *widget, gpointer user_data );
void on_close_file_all(GtkWidget *widget, gpointer user_data );
void on_save_file(GtkWidget *widget, gpointer user_data );
void on_save_file_as(GtkWidget *widget, gpointer user_data );
void on_load_file_by_path(
    WebKitUserContentManager *user_content_manager,
    WebKitJavascriptResult *result,
    gpointer user_data
);
void on_resource_failed(WebKitWebResource *resource, GError *error, gpointer user_data);
char *read_file_content(const char *file_path);
void pass_project_to_js(WebKitWebView *webview, const char *file_path);
void pass_file_to_js(WebKitWebView *webview, const char *file_path);
GPtrArray *read_directory(const gchar *path);
void refresh_folder_structure( gchar *path, gpointer user_data );
void on_script_message_received_folders(
    WebKitUserContentManager *user_content_manager,
    WebKitJavascriptResult *result,
    gpointer user_data
);
void refresh_folder_structure( gchar *path, gpointer user_data );
// General one!
void on_script_message(WebKitUserContentManager *manager,
                                        WebKitJavascriptResult *result,
                                        gpointer user_data);
void on_script_message_received(WebKitUserContentManager *manager,
                                        WebKitJavascriptResult *result,
                                        gpointer user_data);
void on_script_message_received_project(WebKitUserContentManager *manager,
                                        WebKitJavascriptResult *result,
                                        gpointer user_data);
void on_script_message_received_saveas_project(WebKitUserContentManager *manager,
                                              WebKitJavascriptResult *result,
                                              gpointer user_data);
void on_script_message_received_saveas_project(WebKitUserContentManager *manager,
                                              WebKitJavascriptResult *result,
                                              gpointer user_data);
void on_script_message_received_saveas(WebKitUserContentManager *manager,
                                              WebKitJavascriptResult *result,
                                              gpointer user_data);
void on_uri_scheme_request(WebKitURISchemeRequest *request, gpointer user_data);
gboolean script_dialog_cb(WebKitWebView *web_view, WebKitScriptDialog *dialog, gpointer user_data);
gboolean on_key_press_event(GtkWidget *widget, GdkEventKey *event, gpointer user_data);
char* convertDataURLToLocalPath( const char* cwd, const char* relative_path );

#endif // SIGNALS_H



