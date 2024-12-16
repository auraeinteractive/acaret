#ifndef GUI_VIEW_H
#define GUI_VIEW_H

#include "../oop/base.h"

// Create a new view
mlObject *mlCreateView(mlObject *parent);

// View-specific methods
void mlViewSetSize(void *instance, void *data);
void mlViewShow(void *instance, void *data);

#endif // GUI_VIEW_H

