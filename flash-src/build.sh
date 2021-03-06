#!/bin/sh

# A script to build WebSocketMain.swf and WebSocketMainInsecure.zip.

# You need Flex 4 SDK:
# http://opensource.adobe.com/wiki/display/flexsdk/Download+Flex+4

compiler='/Applications/Apache\ Flex/flex/bin/mxmlc'

/Applications/Apache\ Flex/flex/bin/mxmlc \
  -static-link-runtime-shared-libraries \
  -output=../WebSocketMain.swf \
  -source-path=src -source-path=third-party \
  src/net/gimite/websocket/WebSocketMain.as &&

/Applications/Apache\ Flex/flex/bin/mxmlc \
  -static-link-runtime-shared-libraries \
  -output=../WebSocketMainInsecure.swf \
  -source-path=src -source-path=third-party \
  src/net/gimite/websocket/WebSocketMainInsecure.as &&

cd .. &&

zip WebSocketMainInsecure.zip WebSocketMainInsecure.swf &&
rm WebSocketMainInsecure.swf
