#ifndef OOP_BASE_H
#define OOP_BASE_H

#include <stdbool.h>
#include <stddef.h>

// Event callback typedef
typedef void (*mlEventCallback)(void *instance, void *data);

// Event structure
typedef struct {
    char *event_name;     // Name of the event
    mlEventCallback callback; // Callback function for the event
} mlEvent;

// Generic callback and method typedefs
typedef void (*mlMethod)(void *instance, void *data);  // Generic method pointer

// Method table entry
typedef struct {
    char *name;           // Method name
    mlMethod method;      // Function pointer for the method
} mlMethodEntry;

// Attribute entry
typedef struct {
    char *key;            // Attribute name
    void *value;          // Pointer to value
} mlAttributeEntry;

// Base object structure
typedef struct mlObject {
    struct mlObject *parent;           // Pointer to parent class (for inheritance)
    mlMethodEntry *method_table;       // Method table (array of method entries)
    int method_count;                  // Number of methods in method table
    mlAttributeEntry *attributes;      // Attribute table (array of attributes)
    int attribute_count;               // Number of attributes
    mlEvent *events;                   // List of events
    int event_count;                   // Number of events
} mlObject;

// Function prototypes
mlObject *mlObjectCreate(void *parent);      // Create a view object (inherits from parent)
void *mlObjectCreateWithSize(size_t base_size, size_t derived_size, void *parent); // Do it with size
void mlObjectDestroy(mlObject *obj);             // Destroy the object and free resources
void mlAddEvent(mlObject *obj, char *event_name, mlEventCallback callback); // Add an event to object
void mlDoMethod(mlObject *obj, char *method, void *data);  // Call a method on an object
void mlDoSuperMethod(mlObject *obj, char *method, void *data);  // Call a method on the parent object

void mlSetAttribute(mlObject *obj, char *key, void *value);   // Set an attribute of an object
void *myGetAttribute(mlObject *obj, char *key);               // Get an attribute value by key

void mlAddEvent(mlObject *obj, char *event_name, mlEventCallback callback);  // Add an event to an object
void mlTriggerEvent(mlObject *obj, const char *event_name, void *data);           // Trigger an event

#endif // OOP_BASE_H

