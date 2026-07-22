CC = gcc
KIN_ROOT ?= ../../../kin
KIN_LIB_DIR ?= $(KIN_ROOT)/libraries
CFLAGS = -Wall -Wextra -g -I$(KIN_LIB_DIR)/kin
LDFLAGS = -L$(KIN_LIB_DIR) -l:kin.library -Wl,-rpath,$$ORIGIN/../libraries -ldl -lrt -lpthread
TARGET = acaret
SOURCES = main.c
OBJECTS = $(SOURCES:.c=.o)

all: $(TARGET)
	cp acaret ../

$(TARGET): $(OBJECTS)
	$(CC) -o $@ $^ $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJECTS) $(TARGET)

.PHONY: all clean
