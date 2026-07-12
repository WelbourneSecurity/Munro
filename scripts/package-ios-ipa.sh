#!/usr/bin/env bash
# Archive the generated Capacitor iOS project and package it as an
# UNSIGNED .ipa. Runs in CI on a macOS runner after `npm run mobile:ios`.
#
# The build deliberately disables code signing (no signing secrets live in
# this repository), so the resulting munro-unsigned.ipa cannot be installed
# as-is: it must be signed and sideloaded — with AltStore/SideStore, Xcode,
# or an Apple developer certificate — before it will run on a device.
set -euo pipefail

PROJECT="ios/App/App.xcodeproj"
ARCHIVE_PATH="build/Munro.xcarchive"
PAYLOAD_DIR="build/Payload"
IPA_NAME="munro-unsigned.ipa"

# Capacitor's generated project ships no shared .xcscheme. xcodebuild's
# scheme autocreation normally covers that, but a clean CI runner has no
# reason to rely on it — write a minimal shared scheme for the App target
# so `-scheme App` is guaranteed to resolve.
SCHEME_DIR="$PROJECT/xcshareddata/xcschemes"
if [ ! -f "$SCHEME_DIR/App.xcscheme" ]; then
  TARGET_ID=$(awk '
    /Begin PBXNativeTarget section/ { in_section = 1; next }
    /End PBXNativeTarget section/ { in_section = 0 }
    in_section && /\/\* App \*\/ = \{/ { gsub(/^[ \t]+/, ""); print $1; exit }
  ' "$PROJECT/project.pbxproj")
  if [ -z "$TARGET_ID" ]; then
    echo "Could not find the App target in $PROJECT/project.pbxproj" >&2
    exit 1
  fi
  mkdir -p "$SCHEME_DIR"
  cat > "$SCHEME_DIR/App.xcscheme" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<Scheme version="1.7">
   <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES">
      <BuildActionEntries>
         <BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">
            <BuildableReference
               BuildableIdentifier="primary"
               BlueprintIdentifier="$TARGET_ID"
               BuildableName="App.app"
               BlueprintName="App"
               ReferencedContainer="container:App.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
EOF
  echo "Wrote shared scheme for target $TARGET_ID."
fi

xcodebuild archive \
  -project "$PROJECT" \
  -scheme App \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY=""

rm -rf "$PAYLOAD_DIR" "build/$IPA_NAME"
mkdir -p "$PAYLOAD_DIR"
cp -R "$ARCHIVE_PATH/Products/Applications/App.app" "$PAYLOAD_DIR/Munro.app"

(cd build && zip -qry "$IPA_NAME" Payload)
echo "Packaged build/$IPA_NAME"
