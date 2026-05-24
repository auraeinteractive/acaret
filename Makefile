# Acaret — Kin Code Editor
# Build: acaret.cmd (Kin system command)

CMD_DIR = commands/acaret.cmd

all: cmd

cmd:
	$(MAKE) -C $(CMD_DIR)

build-apps:
	./build-apps.sh

deb:
	./make-debian.sh

clean:
	$(MAKE) -C $(CMD_DIR) clean

.PHONY: all cmd build-apps deb clean
