#include "session.h"

void sessionInit() {
    char homeDir[1024];
    char filePath[2048];

    // Get the user's home directory
    if (getenv("HOME") == NULL) {
        fprintf(stderr, "Error: Unable to get home directory.\n");
        return;
    }
    snprintf(homeDir, sizeof(homeDir), "%s/.config", getenv("HOME"));

    // Construct the full file path
    snprintf(filePath, sizeof(filePath), "%s/acaretrc", homeDir);

    // Check if the file exists
    FILE *file = fopen(filePath, "r");
    if (file != NULL) {
        fclose(file);
        printf("File already exists.\n");
        return;
    }

    // Create the file and write the initial content
    file = fopen(filePath, "w");
    if (file == NULL) {
        fprintf(stderr, "Error: Unable to create file %s\n", filePath);
        return;
    }

    // Get the current date and time
    time_t now = time(NULL);
    
    // Write the initial content to the file
    fprintf(file, "{\"date\": %ld}\n", (long)now); // Unix timestamp

    fclose(file);
    printf("File created and initialized.\n");
}