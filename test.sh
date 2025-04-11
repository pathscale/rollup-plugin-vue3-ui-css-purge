#!/bin/bash

TARGET="vue3.dev"
COMMAND="build"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

# Build del plugin
cd "$SCRIPT_DIR"
bun run prepublishOnly

rm -rf "$PARENT_DIR/$TARGET/node_modules/@pathscale/rollup-plugin-vue3-ui-css-purge/dist"
cp -r dist "$PARENT_DIR/$TARGET/node_modules/@pathscale/rollup-plugin-vue3-ui-css-purge/"

cd "$PARENT_DIR/$TARGET"
bun run $COMMAND
