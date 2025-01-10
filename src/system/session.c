#include "session.h"

// Tag: Initializes the session
void sessionInit()
{
    char homeDir[ 1024 ];
    char filePath[ 2048 ];

    // Get the user's home directory
    if( getenv( "HOME" ) == NULL )
    {
        fprintf( stderr, "Error: Unable to get home directory.\n" );
        return;
    }
    snprintf( homeDir, sizeof( homeDir ), "%s/.config", getenv( "HOME" ) );

    // Construct the full file path
    snprintf( filePath, sizeof( filePath ), "%s/acaretrc", homeDir );

    // Check if the file exists
    FILE *file = fopen( filePath, "r" );
    if( file != NULL )
    {
        fclose( file );
        printf( "File already exists.\n" );
        return;
    }

    // Create the file and write the initial content
    file = fopen( filePath, "w" );
    if ( file == NULL )
    {
        fprintf( stderr, "Error: Unable to create file %s\n", filePath );
        return;
    }

    // Get the current date and time
    time_t now = time( NULL );
    
    // Write the initial content to the file
    fprintf( file, "{\"date\": %ld}\n", ( long )now ); // Unix timestamp

    fclose( file );
    printf( "File created and initialized.\n" );
}

// Tag: Reads from the session
char* readFromSession( const char *key )
{
    char homeDir[ 1024 ];
    char filePath[ 2048 ];
    snprintf( homeDir, sizeof( homeDir ), "%s/.config", getenv( "HOME" ) );
    snprintf( filePath, sizeof( filePath ), "%s/acaretrc", homeDir) ;

    FILE *file = fopen( filePath, "r" );
    if( file == NULL )
    {
        fprintf( stderr, "Error: Unable to open file %s for reading\n", filePath );
        return NULL;
    }

    char buffer[ 4096 ];
    size_t bytesRead = fread( buffer, 1, sizeof( buffer ), file );
    fclose( file );

    if( bytesRead == 0 )
    {
        fprintf( stderr, "Error: Unable to read file %s\n", filePath );
        return NULL;
    }

    // Parse the JSON string and extract the value for the given key
    char *json = buffer;
    char *keyStart = strstr( json, key );
    if( keyStart == NULL )
    {
        fprintf( stderr, "Key not found in session file: %s\n", key );
        return NULL;
    }

    // Find the start of the value
    keyStart += strlen( key ) + 3; // Skip the key and ": "
    char *valueStart = strchr( keyStart, '"' );
    if( valueStart == NULL )
    {
        fprintf( stderr, "Invalid JSON format in session file\n" );
        return NULL;
    }

    // Find the end of the value
    char *valueEnd = strchr( valueStart + 1, '"' );
    if( valueEnd == NULL )
    {
        fprintf( stderr, "Invalid JSON format in session file\n" );
        return NULL;
    }

    // Allocate memory for the value and copy it
    size_t valueLength = valueEnd - valueStart - 1;
    char *value = malloc( valueLength + 1 );
    if( value == NULL )
    {
        fprintf( stderr, "Memory allocation failed\n" );
        return NULL;
    }
    strncpy( value, valueStart + 1, valueLength );
    value[ valueLength ] = '\0';

    return value;
}

// Tag: Writes to the rc file which stores the session
void writeToSession( const char *key, const char *value )
{
    char homeDir[ 1024 ];
    char filePath[ 2048 ];
    snprintf( homeDir, sizeof( homeDir ), "%s/.config", getenv( "HOME" ) );
    snprintf( filePath, sizeof( filePath ), "%s/acaretrc", homeDir );

    FILE *file = fopen( filePath, "r" );
    if( file == NULL )
    {
        fprintf( stderr, "Error: Unable to open file %s for reading\n", filePath );
        return;
    }

    char buffer[ 4096 ];
    size_t bytesRead = fread( buffer, 1, sizeof( buffer ), file );
    fclose( file );

    if( bytesRead == 0 )
    {
        fprintf( stderr, "Error: Unable to read file %s\n", filePath );
        return;
    }

    // Parse the JSON string and update the value for the given key
    char *json = buffer;
    char *keyStart = strstr( json, key );
    if( keyStart == NULL )
    {
        fprintf( stderr, "Key not found in session file: %s\n", key );
        return;
    }

    // Find the start of the value
    keyStart += strlen( key ) + 3; // Skip the key and ": "
    char *valueStart = strchr( keyStart, '"' );
    if( valueStart == NULL )
    {
        fprintf( stderr, "Invalid JSON format in session file\n" );
        return;
    }

    // Find the end of the value
    char *valueEnd = strchr( valueStart + 1, '"' );
    if( valueEnd == NULL )
    {
        fprintf( stderr, "Invalid JSON format in session file\n" );
        return;
    }

    // Allocate memory for the new JSON string
    size_t newJsonLength = strlen( json ) - ( valueEnd - json ) + strlen( value ) + 2;
    char *newJson = malloc( newJsonLength );
    if( newJson == NULL )
    {
        fprintf( stderr, "Memory allocation failed\n" );
        return;
    }

    // Construct the new JSON string
    strncpy( newJson, json, valueStart - json );
    newJson[ valueStart - json ] = '\0';
    strcat( newJson, "\"" );
    strcat( newJson, value );
    strcat( newJson, "\"" );

    if( valueEnd != NULL )
    {
        strcat( newJson, valueEnd + 1 );
    }

    // Write the new JSON string back to the file
    file = fopen( filePath, "w" );
    if( file == NULL )
    {
        fprintf( stderr, "Error: Unable to open file %s for writing\n", filePath );
        free( newJson );
        return;
    }
    fwrite( newJson, 1, strlen( newJson ), file );
    fclose( file );

    // Free the memory
    free( newJson );
}
