# Friends Rank v4

Friends Rank is a Panorama mod for Deadlock that displays the current Ranked badge, including divisions I-VI, on player profile cards and the full profile page. It also provides shortcuts to public Statlocker profiles.

This release is VPK-only. It does not require Node.js, Sharp, a local helper, or separately installed assets at runtime.

## Features

- Displays the current Ranked badge and division on profile tooltips and full profiles.
- Uses Obscurus as the loading placeholder and as the safe result for unranked players.
- Prevents a previously viewed player's badge from appearing on the next profile.
- Adds a Statlocker action to the persistent profile card opened by clicking a player.
- Adds a small Statlocker logo next to the player name on the full profile page.
- Adds circular Statlocker buttons to the match-history scoreboard and the post-game hero screen.
- Leaves Deadlock's expanded post-game player action menu completely native.

## Rank data

Panorama loads the badge directly from:

```text
https://api.deadlock-api.com/v1/players/{account_id}/rank/image?format=webp
```

The endpoint returns a composed badge containing its division. The mod does not display a textual rank name such as `Oracle IV`.

Rank data is supplied by Deadlock API and is based on the latest available Ranked match. An internet connection to `api.deadlock-api.com` is required.

To keep profile transitions safe, the mod:

- Waits 750 ms for a stable popup identity before requesting the badge.
- Hides the current badge immediately when the profile enters `.Loading` or its identity changes.
- Rejects delayed `ImageLoaded` callbacks belonging to another player.
- Caches badge URLs by AccountID for 10 minutes.
- Applies a 15-second cooldown after an image error to prevent request loops.
- Never restores the badge from the previously viewed player after a failure.

If the API is unavailable, the account is protected, or no recent rank exists, the UI remains on a safe Obscurus state.

## Statlocker integration

Statlocker URLs are created only after validating the current AccountID:

```text
https://statlocker.gg/profile/{AccountID}
```

The mod opens links through Deadlock's native external-browser event and uses `SteamOverlayAPI.OpenURL` as a fallback. If neither method is available, the relevant action remains disabled without affecting rank badges.

Available Statlocker actions:

- Persistent profile card: `View Statlocker Profile` appears below the native card contents.
- Full profile: click the green Statlocker logo beside the player name.
- Match-history scoreboard: click the circular green button beside a player row.
- Post-game hero screen: click the circular green button beside Commend.

The expanded post-game menu containing the native View Profile, Add Friend, and Report actions is not replaced or modified.

## Installation

Close Deadlock, then copy:

```text
build\pak88_dir.vpk
```

to:

```text
Deadlock\game\citadel\addons\pak88_dir.vpk
```

Choose a different VPK slot if `pak88_dir.vpk` is already used by another mod. Restart Deadlock completely after replacing an existing version.

No helper application needs to be started.

## Testing the source

From the `Friend-Ranks` directory:

```powershell
node --test tests\*.test.js
node .\scripts\validate-friends-rank.js
node --check .\panorama\scripts\friends_rank.js
node --check .\panorama\scripts\friends_rank_scoreboard.js
```

## Building

With Reduced CSDK 12 and VPKEdit installed:

```powershell
.\scripts\build-friends-rank.ps1 `
  -ReducedCsdkPath "C:\Users\hioki\Downloads\Reduced_CSDK_12" `
  -VpkEditCliPath "C:\Program Files\VPKEdit\VPKEditCLI.exe" `
  -OutputPath ".\build\pak88_dir.vpk"
```

The build script validates the source, synchronizes and compiles the Panorama resources, creates the VPK, and verifies every required packaged asset.

## Compatibility and troubleshooting

- `rank00_lg` is displayed while a rank image is loading.
- The final badge remains hidden until Panorama emits `ImageLoaded`.
- A failed request enters a terminal state for the current profile instead of retrying continuously.
- The mod replaces `profile_card.xml`, `citadel_db_page_profile.xml`, `post_game/citadel_db_post_game_scoreboard_new.xml`, and `post_game/citadel_db_post_game_team.xml`.
- It may conflict with other mods that replace the player card, full profile page, match-history scoreboard, or post-game hero screen.
- It does not package or replace `post_game/citadel_db_post_game_player_context_menu.xml`.
- Deadlock updates may require rebasing the replaced XML files against Valve's latest resources and rebuilding the VPK.

For manual testing, rapidly inspect consecutive players at 1080p and 1440p, including the local player, unranked accounts, inactive players, and players shown as `Not friends`. The primary correctness requirement is that the badge from a previous player must never appear, even for a single frame.

## Credits

Rank data and badge images are provided by [Deadlock API](https://api.deadlock-api.com/docs).

Statlocker and its logo belong to their respective owner. This mod is not affiliated with or endorsed by Statlocker.

Deadlock and its resources belong to Valve.
