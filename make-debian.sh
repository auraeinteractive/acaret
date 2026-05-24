#!/bin/bash
# Build kin-acaret_<version>_<arch>.deb into dist/
# Installs to /opt/kin/modules/kin-acaret/ with Kin app + acaret.cmd
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

if ! command -v fakeroot >/dev/null 2>&1; then
	echo "install fakeroot: sudo apt install fakeroot" >&2
	exit 1
fi
if ! command -v dpkg-deb >/dev/null 2>&1; then
	echo "install dpkg-deb (dpkg package)" >&2
	exit 1
fi

# Version: top entry in debian/changelog
if [[ -f "$ROOT/debian/changelog" ]]; then
    VERSION="$(head -1 "$ROOT/debian/changelog" | sed -n 's/.*(\([^)]*\)).*/\1/p')"
fi
if [[ -z "${VERSION:-}" ]]; then
    VERSION="0.0.0-1"
fi

if command -v dpkg-architecture >/dev/null 2>&1; then
	ARCH="$(dpkg-architecture -qDEB_HOST_ARCH)"
else
	ARCH="$(uname -m)"
	case "$ARCH" in
	x86_64) ARCH=amd64 ;;
	aarch64) ARCH=arm64 ;;
	esac
fi

STAGE="$(mktemp -d "${TMPDIR:-/tmp}/kin-acaret-deb.XXXXXX")"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

MODULE_DIR="$STAGE/opt/kin/modules/kin-acaret"
mkdir -p "$MODULE_DIR"

# Copy Kin app (repository/Applications/Development/kin_acaret/)
if [[ -d "$ROOT/kin" ]]; then
	mkdir -p "$MODULE_DIR/repository/Applications/Development"
	cp -a "$ROOT/kin" "$MODULE_DIR/repository/Applications/Development/kin_acaret"
fi

# Copy commands/ (acaret.cmd)
if [[ -d "$ROOT/commands" ]]; then
	cp -a "$ROOT/commands" "$MODULE_DIR/"
fi

# Copy specs/ if present
if [[ -d "$ROOT/specs" ]]; then
	cp -a "$ROOT/specs" "$MODULE_DIR/"
fi

# Copy icons
if [[ -f "$ROOT/icon_128.png" ]]; then
	cp "$ROOT/icon_128.png" "$MODULE_DIR/"
fi
if [[ -f "$ROOT/icon.png" ]]; then
	cp "$ROOT/icon.png" "$MODULE_DIR/"
fi

# Build acaret.cmd if Makefile exists
if [[ -f "$ROOT/commands/acaret.cmd/Makefile" ]]; then
	make -C "$ROOT/commands/acaret.cmd" 2>/dev/null || true
	if [[ -f "$ROOT/commands/acaret.cmd/acaret" ]]; then
		cp "$ROOT/commands/acaret.cmd/acaret" "$MODULE_DIR/commands/acaret.cmd/"
	fi
fi

# Control
SIZE="$(du -sk "$MODULE_DIR" 2>/dev/null | cut -f1)"
SIZE="${SIZE:-0}"

mkdir -p "$STAGE/DEBIAN"

cat >"$STAGE/DEBIAN/control" <<EOF
Package: kin-acaret
Version: $VERSION
Section: misc
Priority: optional
Architecture: $ARCH
Maintainer: Kin <packages@os-kin.com>
Installed-Size: $SIZE
Depends: kin (>= 2.0)
Recommends: acaret
Description: Kin Code Editor — Acaret for Kin OS
 Acaret is a full-featured source code editor for Kin OS.
 Features ACE Editor with multi-tab editing, syntax highlighting
 for 20+ languages, integrated AI chat, and project management.
 Installs to /opt/kin/modules/kin-acaret/.
EOF

cat >"$STAGE/DEBIAN/postinst" <<'POSTINST'
#!/bin/bash
set -e

case "$1" in
    configure) ;;
    abort-upgrade|abort-deconfigure|abort-remove) exit 0 ;;
    *) exit 0 ;;
esac

mkdir -p /opt/kin/modules
chown kin:kin /opt/kin/modules 2>/dev/null || true

# Install Kin app into runtime repository
if [ -d /opt/kin/modules/kin-acaret/repository/Applications ]; then
    mkdir -p /usr/lib/kin/repository/Applications
    cp -a /opt/kin/modules/kin-acaret/repository/Applications/. /usr/lib/kin/repository/Applications/
fi

# Build acaret.cmd if source present
if [ -d /opt/kin/modules/kin-acaret/commands/acaret.cmd ]; then
    cd /opt/kin/modules/kin-acaret/commands/acaret.cmd
    if [ -f Makefile ]; then
        make 2>/dev/null || echo "acaret.cmd: build skipped (install build tools and rebuild)" >&2
    fi
    # Install command
    if [ -f acaret ]; then
        mkdir -p /usr/lib/kin/commands
        cp acaret /usr/lib/kin/commands/acaret
    fi
fi
POSTINST
chmod 755 "$STAGE/DEBIAN/postinst"

cat >"$STAGE/DEBIAN/prerm" <<'PRERM'
#!/bin/bash
set -e
# Remove acaret command on removal
if [ "$1" = "remove" ] || [ "$1" = "purge" ]; then
    rm -f /usr/lib/kin/commands/acaret 2>/dev/null || true
fi
PRERM
chmod 755 "$STAGE/DEBIAN/prerm"

mkdir -p "$ROOT/dist"
OUT="$ROOT/dist/kin-acaret_${VERSION}_${ARCH}.deb"
fakeroot dpkg-deb --root-owner-group --build "$STAGE" "$OUT"
echo "Built $OUT"
