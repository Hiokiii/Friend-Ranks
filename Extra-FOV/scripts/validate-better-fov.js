"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const layoutPath = path.join(root, "panorama", "layout", "popups", "popup_settings.xml");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(fs.existsSync(layoutPath), "Missing popup_settings.xml");
const xml = fs.readFileSync(layoutPath, "utf8");

assert(
  /id="CameraFOV"[^>]*convar="citadel_camera_hero_fov"[^>]*min="75"[^>]*max="90"/.test(xml),
  "Valve's native Camera FOV slider must remain unchanged",
);
assert(
  /id="BetterFOVAspectRatio"[^>]*convar="r_aspectratio"[^>]*min="1\.78"[^>]*max="3\.0"/.test(xml),
  "Extended FOV Scale slider is missing or has the wrong range",
);
assert((xml.match(/id="BetterFOVAspectRatio"/g) || []).length === 1, "Extended FOV Scale slider must appear exactly once");
assert(xml.includes('text="Extended FOV Scale"'), "Extended FOV Scale label is missing");
assert(!xml.includes("better_fov_settings.vjs_c"), "Crash-prone standalone persistence script must not be included");
assert(!xml.includes("BetterFOVSaveButton"), "Standalone hero-build persistence control must not be present");
assert(!xml.includes("BetterFOVIncreaseBinder"), "Unsafe custom CitadelSettingsKeyBinder must not be present");
assert(!xml.includes("BetterFOVIncreaseKey"), "Non-persistent binding dropdown must not be present");
assert(!xml.includes("BetterFOVIncreaseBindingInfo"), "Experimental binding information must not be present");
assert(!xml.includes("better_fov_keys.vjs_c"), "Experimental key handler must not be included");

console.log("OK: Better FOV source invariants passed");
