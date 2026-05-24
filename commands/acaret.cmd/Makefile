CC = gcc
CFLAGS = -Wall -g -I../../libraries/kin
LDFLAGS = -L../../libraries -l:kin.library -Wl,-rpath,$$ORIGIN/../libraries -ldl -lrt -lpthread
TARGET = acaret
SOURCES = main.c
OBJECTS = $(SOURCES:.c=.o)

all: $(TARGET)
	cp acaret ../

$(TARGET): $(OBJECTS)
	$(CC) -o $@ $^ $(LDFLAGS)

%.o: %.c
	$(CC) -c $< -o $@

clean:
	rm -f $(OBJECTS) $(TARGET)

.PHONY: all clean
