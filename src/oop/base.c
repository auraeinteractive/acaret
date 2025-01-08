#include "base.h"

// In base.c
mlObject *mlObjectCreate( void *parent )
{
    mlObject *obj = (mlObject *)malloc( sizeof( mlObject ) );
    obj->parent = parent;
    obj->method_table = NULL;
    obj->method_count = 0;
    obj->attributes = NULL;
    obj->attribute_count = 0;
    obj->events = NULL;
    obj->event_count = 0;
    return obj;
}

// Generic inheritance function
void *mlObjectCreateWithSize( size_t base_size, size_t derived_size, void *parent )
{
    // Allocate memory for the derived object
    if( derived_size < base_size )
    {
        fprintf( stderr, "Derived size cannot be smaller than base size\n" );
        return NULL;
    }

    void *object = malloc( derived_size );
    if( !object )
    {
        fprintf(stderr, "Failed to allocate memory for object\n");
        return NULL;
    }

    // Initialize the base portion
    memset( object, 0, base_size ); // Zero out the base part
    mlObject *base = ( mlObject * )object;
    base->parent = parent;
    base->method_table = NULL;
    base->method_count = 0;
    base->attributes = NULL;
    base->attribute_count = 0;
    base->events = NULL;
    base->event_count = 0;

    return object;
}

// Destroy an object and free resources
void mlObjectDestroy( mlObject *obj )
{
    if( !obj ) return;

    // Free methods (if dynamically allocated)
    if( obj->method_table )
    {
        free( obj->method_table );
    }

    // Free attributes
    for( int i = 0; i < obj->attribute_count; i++ )
    {
        free( obj->attributes[ i ].key );
        
        // Assuming values are pointers to dynamically allocated memory
        free( obj->attributes[ i ].value );
    }
    free(obj->attributes);

    // Free events
    for( int i = 0; i < obj->event_count; i++ )
    {
        free( obj->events[ i ].event_name );
        obj->events[ i ].event_name = NULL;
    }
    obj->event_count = 0;
    free( obj->events );
    printf( "Object events destroyed\n" );

    free( obj );
    printf( "Object destroyed\n" );
}

// Dispatch a method
void mlDoMethod(mlObject *obj, char *method, void *data)
{
    if( obj == NULL || obj->method_table == NULL )
    {
        printf( "Object or method table is NULL\n" );
        return;
    }
    for( int i = 0; i < obj->method_count; i++ )
    {
        if( strcmp( obj->method_table[ i ].name, method ) == 0) {  // Find the method
            obj->method_table[ i ].method( obj, data );  // Call the method
            return;  // Exit after method is found and called
        }
    }
    // If method not found in current object, check the parent object
    if( obj->parent )
    {
        mlDoSuperMethod( obj->parent, method, data );
    }
    else
    {
        printf("Method '%s' not found.\n", method);  // Print error if method not found
    }
}

// Dispatch a method in the parent class
void mlDoSuperMethod(mlObject *obj, char *method, void *data )
{
    if( obj->parent )
    {
        mlDoMethod( obj->parent, method, data );  // Call the method on the parent object
    }
    else
    {
        printf("Super method '%s' not found.\n", method);  // Print error if super method not found
    }
}

// Set an attribute
void mlSetAttribute( mlObject *obj, char *key, void *value )
{
    for( int i = 0; i < obj->attribute_count; i++ )
    {
        if( strcmp( obj->attributes[ i ].key, key ) == 0)
        {
            obj->attributes[ i ].value = value;  // Update attribute value
            return;
        }
    }
    // If attribute not found, add it
    obj->attribute_count++;
    obj->attributes = ( mlAttributeEntry * )realloc(
        obj->attributes, obj->attribute_count * sizeof( mlAttributeEntry ) );  // Reallocate memory
    obj->attributes[ obj->attribute_count - 1 ].key = strdup( key );  // Duplicate the key
    obj->attributes[ obj->attribute_count - 1 ].value = value;  // Set value
}

// Get an attribute
void *myGetAttribute( mlObject *obj, char *key )
{
    for( int i = 0; i < obj->attribute_count; i++ )
    {
        if( strcmp( obj->attributes[ i ].key, key ) == 0)
        {
            return obj->attributes[ i ].value;  // Return attribute value
        }
    }
    // If attribute not found, check the parent object
    if( obj->parent )
    {
        return myGetAttribute( obj->parent, key );
    }
    return NULL;  // Return NULL if attribute not found
}

// Add an event to the object
void mlAddEvent( mlObject *obj, char *event_name, mlEventCallback callback )
{
    obj->events = ( mlEvent * )realloc( obj->events, ( obj->event_count + 1 ) * sizeof( mlEvent ) );
    if( obj->events == NULL )
    {
        fprintf(stderr, "[mlAddEvent] Reallocation failed for events\n");
        return;
    }
    
    printf( "[mlAddEvent] Adding event: %s\n", event_name );
    obj->events[ obj->event_count].event_name = strdup( event_name );
    obj->events[ obj->event_count].callback = callback;
    if( obj->events[obj->event_count].event_name == NULL )
    {
        fprintf( stderr, "[mlAddEvent] String duplication failed for event name.\n" );
        return;
    }
    obj->event_count = obj->event_count + 1;
    
    printf( "[mlAddEvent] Added event \"%s\" (new event count %d)\n", event_name, obj->event_count );
}

// Trigger an event
void mlTriggerEvent(mlObject *obj, const char *event_name, void *data)
{
    if( !obj )
    {
        printf( "[mlTriggerEvent] Skipping null object\n" );
        return;
    }
    printf( "[mlTriggerEvent] Trying to find event \"%s\".\n", event_name );
    if( obj->event_count > 0 )
    {
        printf( "[mlTriggerEvent] Found events. %d events total.\n", obj->event_count );
        for( int i = 0; i < obj->event_count; i++ ) 
        {
            printf( "[mlTriggerEvent] Looking at event %d\n", (i+1));
            // Find the event
            if( strcmp(obj->events[i].event_name, event_name) == 0 )
            {  
                //
                printf( "[mlTriggerEvent] Found event %s\n", event_name );
                obj->events[i].callback(obj, data);  // Trigger the event callback
                return;  // Exit after triggering the event
            }
        }
        // If event not found, check the parent object
        if( obj->parent )
        {
            mlTriggerEvent(obj->parent, event_name, data);
        }
        else
        {
            printf("[mlTriggerEvent] Event '%s' not found.\n", event_name);  // Print error if event not found
        }
    }
    else
    {
        printf( "[mlTriggerEvent] Could not find any events.\n" );
    }
}

