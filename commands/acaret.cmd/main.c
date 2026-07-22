#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include "kin.library.h"

static const char* get_arg_value(int argc, char* argv[], const char* key)
{
    int key_len = (int)strlen(key);
    for (int i = 1; i < argc; i++) {
        if (strncmp(argv[i], key, key_len) == 0 && argv[i][key_len] == '=')
            return argv[i] + key_len + 1;
    }
    return NULL;
}

typedef struct {
    int done;
    char message[4096];
} wait_ctx_t;

static void on_resp(const char* event, const char* message, void* user_data,
                    long timestamp, unsigned long message_id, unsigned long callback_id)
{
    (void)event; (void)timestamp; (void)message_id; (void)callback_id;
    wait_ctx_t* ctx = (wait_ctx_t*)user_data;
    if (!ctx) return;
    if (message) {
        strncpy(ctx->message, message, sizeof(ctx->message) - 1);
        ctx->message[sizeof(ctx->message) - 1] = '\0';
    } else
        ctx->message[0] = '\0';
    ctx->done = 1;
}

int main(int argc, char* argv[])
{
    const char* username = get_arg_value(argc, argv, "username");
    const char* action = get_arg_value(argc, argv, "action");
    const char* path = get_arg_value(argc, argv, "path");
    const char* manager_pid_arg = get_arg_value(argc, argv, "manager_pid");
    const char* manager_pid_env = getenv("KIN_MANAGER_PID");
    int manager_pid = 0;
    if (manager_pid_arg && *manager_pid_arg) manager_pid = atoi(manager_pid_arg);
    else if (manager_pid_env && *manager_pid_env) manager_pid = atoi(manager_pid_env);

    if (manager_pid <= 0) {
        printf("{\"response\":\"fail\",\"message\":\"Missing manager pid.\"}\n");
        return 1;
    }
    if (kin_init("acaret", manager_pid) == -1) {
        printf("{\"response\":\"fail\",\"message\":\"IPC init failed.\"}\n");
        return 1;
    }

    if (!action || !*action) {
        printf("{\"response\":\"ok\",\"message\":\"Acaret command ready\"}\n");
        kin_cleanup();
        return 0;
    }

    if (strcmp(action, "info") == 0) {
        printf("{\"response\":\"ok\",\"name\":\"acaret\",\"version\":\"1.0.0\"}\n");
    } else if (strcmp(action, "list_projects") == 0) {
        if (!path || !*path || path[0] == '/' || !strchr(path, ':')) {
            printf("{\"response\":\"fail\",\"message\":\"list_projects requires path=Volume:relative/path.\"}\n");
            kin_cleanup();
            return 1;
        }
        wait_ctx_t ctx;
        memset(&ctx, 0, sizeof(ctx));
        char payload[512];
        if (username && *username)
            snprintf(payload, sizeof(payload), "username=%s path=%s", username, path);
        else
            snprintf(payload, sizeof(payload), "path=%s", path);
        unsigned long mid = kin_message_write_callback("dos_dir", payload, on_resp, &ctx);
        if (mid == 0) {
            kin_cleanup();
            printf("{\"response\":\"fail\",\"message\":\"Send failed.\"}\n");
            return 1;
        }
        int elapsed = 0;
        while (!ctx.done && elapsed < 5000) {
            kin_wait_messages();
            usleep(10000);
            elapsed += 10;
        }
        if (!ctx.done) {
            kin_cleanup();
            printf("{\"response\":\"fail\",\"message\":\"Timeout.\"}\n");
            return 1;
        }
        printf("%s\n", ctx.message[0] ? ctx.message : "{}");
    } else {
        printf("{\"response\":\"fail\",\"message\":\"Unknown action.\"}\n");
    }

    kin_cleanup();
    return 0;
}
