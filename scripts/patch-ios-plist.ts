/**
 * Adds the location usage description to the generated iOS Info.plist.
 *
 * The iOS project is generated fresh in CI (`npx cap add ios`), so this
 * patch runs after `cap sync ios` rather than being committed. WKWebView
 * surfaces plain `navigator.geolocation` through Core Location and only
 * needs `NSLocationWhenInUseUsageDescription` set — no plugin required.
 *
 * Idempotent: running it twice leaves the plist unchanged.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PLIST_PATH = 'ios/App/App/Info.plist';

const KEY = 'NSLocationWhenInUseUsageDescription';
const DESCRIPTION =
  'Munro uses your location to detect when you reach a summit so it can ' +
  'be marked as bagged. Your location stays on your device.';

const plist = readFileSync(PLIST_PATH, 'utf8');

if (plist.includes(`<key>${KEY}</key>`)) {
  console.log(`${PLIST_PATH} already declares ${KEY}.`);
  process.exit(0);
}

const closing = '</dict>\n</plist>';
if (!plist.includes(closing)) {
  console.error(
    `Could not find closing ${closing.replaceAll('\n', ' ')} in ${PLIST_PATH}.`,
  );
  process.exit(1);
}

const entry = `\t<key>${KEY}</key>\n\t<string>${DESCRIPTION}</string>\n`;
writeFileSync(PLIST_PATH, plist.replace(closing, `${entry}${closing}`));
console.log(`Added ${KEY} to ${PLIST_PATH}.`);
