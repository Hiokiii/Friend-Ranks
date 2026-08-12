# Better FOV (Experimental)

Adds a separate **Extended FOV Scale** slider to Deadlock's Camera settings while leaving Valve's native **Camera FOV** slider unchanged.

The additional slider controls `r_aspectratio` from `1.78` to `3.00`. This is the same projection override commonly added to `gameinfo.gi`, exposed as an in-game control instead.

Approximate values on a 16:9 display with Camera FOV set to 90:

| Extended FOV Scale | Approximate horizontal FOV |
| --- | --- |
| 1.78 | 90 degrees |
| 2.00 | 96.7 degrees |
| 2.40 | 106.9 degrees |
| 3.00 | 118.7 degrees |

These are estimates because `r_aspectratio` changes the projection aspect ratio rather than setting a literal FOV angle.

## Installation

Copy `build/pak89_dir.vpk` into Deadlock's `game/citadel/addons` directory, or install it with a compatible Deadlock mod manager. The game's search paths must already load `citadel/addons`.

Open **Settings**, find the **Camera** subsection, and adjust **Extended FOV Scale**. The existing **Camera FOV** control remains available directly above it.

Deadlock does not persist `r_aspectratio`, so the slider returns to the engine default after restarting. Better FOV intentionally changes it only for the current game session.

For a fixed value on every launch, add `"r_aspectratio" "2.4"` (using your preferred value) to the `ConVars` section of `gameinfo.gi`. Do not combine that startup override with a separate persistence mod unless you know which value should win.

A standalone hero-build persistence experiment was removed because loading its HUD automation during startup caused Deadlock to crash. Universal Mod Manager remains the safer in-game persistence option because its storage loader is already designed and tested for Deadlock's build UI.

Because this is an overridden native settings layout, it may need rebasing after Deadlock updates `popup_settings.xml`.
