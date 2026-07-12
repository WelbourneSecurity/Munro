/**
 * Adds location permissions to the generated Android manifest.
 *
 * The Android project is generated fresh in CI (`npx cap add android`), so
 * this patch runs after `cap sync android` rather than being committed.
 * Capacitor's WebView (BridgeWebChromeClient) handles the runtime
 * permission prompt for plain `navigator.geolocation` itself — it only
 * needs these permissions declared in the manifest, no plugin required.
 *
 * Idempotent: running it twice leaves the manifest unchanged.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MANIFEST_PATH = 'android/app/src/main/AndroidManifest.xml';

const ENTRIES = [
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
];

const manifest = readFileSync(MANIFEST_PATH, 'utf8');

const missing = ENTRIES.filter((entry) => !manifest.includes(entry));
if (missing.length === 0) {
  console.log(`${MANIFEST_PATH} already declares location permissions.`);
  process.exit(0);
}

const closingTag = '</manifest>';
if (!manifest.includes(closingTag)) {
  console.error(`Could not find ${closingTag} in ${MANIFEST_PATH}.`);
  process.exit(1);
}

const block = missing.map((entry) => `    ${entry}\n`).join('');
const patched = manifest.replace(closingTag, `${block}${closingTag}`);
writeFileSync(MANIFEST_PATH, patched);
console.log(`Added to ${MANIFEST_PATH}:`);
for (const entry of missing) {
  console.log(`  ${entry}`);
}
