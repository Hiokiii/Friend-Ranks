"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

function assert(condition, message) { if (!condition) throw new Error(message); }
function read(relativePath) {
  const absolute = path.join(root, relativePath);
  assert(fs.existsSync(absolute), `Falta ${relativePath}`);
  const source = fs.readFileSync(absolute, "utf8");
  assert(source.trim(), `${relativePath} esta vacio`);
  return source;
}

const requiredFiles = [
  "panorama/layout/profile_card.xml",
  "panorama/layout/citadel_db_page_profile.xml",
  "panorama/layout/post_game/citadel_db_post_game_scoreboard_new.xml",
  "panorama/layout/post_game/citadel_db_post_game_team.xml",
  "panorama/styles/friends_rank.css",
  "panorama/styles/friends_rank_scoreboard.css",
  "panorama/scripts/friends_rank_config.js",
  "panorama/scripts/friends_rank.js",
  "panorama/scripts/friends_rank_scoreboard.js",
  "panorama/images/friends_rank/statlocker_logo_green.png",
  "panorama/images/friends_rank/statlocker_logo_green.vtex",
];
for (const file of requiredFiles) {
  if (file.endsWith(".png")) assert(fs.statSync(path.join(root, file)).size > 0, `${file} esta vacio`);
  else read(file);
}

const xml = read("panorama/layout/profile_card.xml");
const profileXml = read("panorama/layout/citadel_db_page_profile.xml");
const css = read("panorama/styles/friends_rank.css");
const config = read("panorama/scripts/friends_rank_config.js");
const runtime = read("panorama/scripts/friends_rank.js");
const scoreboardXml = read("panorama/layout/post_game/citadel_db_post_game_scoreboard_new.xml");
const postGameTeamXml = read("panorama/layout/post_game/citadel_db_post_game_team.xml");
const scoreboardCss = read("panorama/styles/friends_rank_scoreboard.css");
const scoreboardRuntime = read("panorama/scripts/friends_rank_scoreboard.js");

for (const fragment of ["friends_rank.vcss_c", "friends_rank_config.vjs_c", "friends_rank.vjs_c", 'id="FriendsRankRoot"', 'id="FriendsRankHiddenAccountID"', 'id="FriendsRankVisibleAccountID"', 'id="FriendsRankStatlockerPopupButton"', 'class="FriendsRankStatlockerLogo"', 'id="FriendsRankLoaderBadge"', 'id="FriendsRankMediaHost"', "rank00_lg_psd.vtex", "$.FriendsRankRefreshProfile"]) {
  assert(xml.includes(fragment), `profile_card.xml no contiene ${fragment}`);
}
assert(xml.indexOf('id="FriendsRankStatlockerPopupButton"') > xml.indexOf('id="CardMain"'), "Statlocker debe aparecer debajo de las acciones nativas");
for (const id of ["MiniProfileContainer", "ContentsMain", "HeroInfo", "CardHeader", "CardMain", "PartyInfo", "CardOverlay"]) {
  assert(xml.includes(`id="${id}"`), `Falta el panel nativo ${id}`);
}
const ids = [...xml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert(duplicates.length === 0, `IDs XML duplicados: ${[...new Set(duplicates)].join(", ")}`);

for (const fragment of ["friends_rank.vcss_c", "friends_rank_config.vjs_c", "friends_rank.vjs_c", 'class="DashboardPage FriendsRankProfilePageRoot"', 'id="FriendsRankProfileFriendCode"', 'id="FriendsRankProfileActions"', 'id="FriendsRankStatlockerProfileButton"', 'class="FriendsRankStatlockerLogo"', 'id="FriendsRankRoot"', 'id="FriendsRankLoaderBadge"', 'id="FriendsRankMediaHost"', "rank00_lg_psd.vtex"]) {
  assert(profileXml.includes(fragment), `citadel_db_page_profile.xml no contiene ${fragment}`);
}
assert(profileXml.indexOf('id="FriendsRankStatlockerProfileButton"') < profileXml.indexOf('id="SelfName"'), "El nombre del perfil debe estar dentro del boton de Statlocker");
assert(!profileXml.includes('text="View Statlocker Profile"'), "El perfil principal no debe conservar el enlace textual de Statlocker");
for (const id of ["HeroScenePanel", "SelfImage", "SelfName", "MatchHistoryArea", "StatsContent", "HeroList"]) {
  assert(profileXml.includes(`id="${id}"`), `Falta el panel nativo de perfil ${id}`);
}
assert(profileXml.includes("<CitadelHeroScenePanelNew"), "El perfil principal no usa el panel de escena vigente");
assert(!profileXml.includes("<ScenePanel"), "ScenePanel obsoleto puede provocar un fatal error");
assert(profileXml.includes("<AsyncDataPanel"), "Falta AsyncDataPanel vigente");

for (const id of ["FriendsRankHiddenAccountID", "FriendsRankProfileAccountID", "FriendsRankProfileFriendCode", "FriendsRankRoot", "FriendsRankPlaceholder", "FriendsRankLoaderBadge", "FriendsRankSpinner", "FriendsRankMediaHost"]) {
  const occurrences = profileXml.match(new RegExp(`id="${id}"`, "g")) || [];
  assert(occurrences.length === 1, `ID Friends Rank invalido en perfil principal: ${id}`);
}
for (const selector of [".FriendsRankRoot", ".FriendsRankBadge", ".FriendsRankLoaderSlot", ".FriendsRankStateWaiting", ".FriendsRankStateResolving", ".FriendsRankStateRequested", ".FriendsRankStateUnavailable"]) {
  assert(css.includes(selector), `CSS no contiene ${selector}`);
}
assert(css.includes(".FriendsRankStatlockerLogo") && css.includes("opacity-mask: url(\"s2r://panorama/images/friends_rank/statlocker_logo_green.vtex\")"), "El logo de Statlocker debe renderizarse como mascara sin fondo");

assert(config.includes("version: 16"), "La configuracion debe usar revision v16");
assert(config.includes("debug: false"), "Los logs deben estar desactivados");
assert(config.includes('apiBaseUrl: "https://api.deadlock-api.com/v1/players"'), "Endpoint HTTPS incorrecto");
assert(config.includes("cacheTtlMs: 600000"), "TTL debe ser diez minutos");
assert(config.includes("activeWatchMs: 8000"), "La vigilancia del popup debe ser acotada");
assert(config.includes("popupSettleMs: 750"), "Falta la espera estable de 750 ms del popup");
assert(config.includes("mainProfileSettleMs: 2000"), "Falta la espera estable del perfil principal");
assert(config.includes("popupEmptyPresenceSettleMs: 1500"), "Falta la espera segura para perfiles sin presencia");
assert(config.includes("popupGuardIntervalSeconds: 0.016"), "Guard del popup incorrecto");
assert(config.includes("failureCooldownMs: 15000"), "Cooldown de errores incorrecto");
assert(config.includes("popupReadyTimeoutMs: 5000"), "Timeout del popup incorrecto");
assert(config.includes('statlockerBaseUrl: "https://statlocker.gg/profile"'), "Base de Statlocker incorrecta");

assert(runtime.includes("/rank/image?format="), "Falta el endpoint /rank/image");
assert(runtime.includes("buildStatlockerUrl"), "Falta el constructor seguro de Statlocker");
assert(runtime.includes('"ContextMenuBody"') && runtime.includes("isPersistentProfilePopup"), "Statlocker no distingue el popup persistente del tooltip temporal");
assert(runtime.includes('$.DispatchEvent("ExternalBrowserGoToURL", url)'), "Falta el canal nativo de URL externa de Deadlock");
assert(runtime.includes("SteamOverlayAPI.OpenURL(url)"), "Falta el respaldo de Steam Overlay para Statlocker");
for (const removedPinFeature of ["RegisterKeyBind", "IsControlDown", "IsAltDown", "syncDirectModifierPin", "watchPinHold", "FriendsRankPinned", "statlockerPinBinding"]) {
  assert(!runtime.includes(removedPinFeature), `Runtime conserva el pin eliminado: ${removedPinFeature}`);
  assert(!config.includes(removedPinFeature), `Configuracion conserva el pin eliminado: ${removedPinFeature}`);
}
assert(runtime.includes('$.CreatePanel("Image"'), "Image no se recrea por token");
assert(runtime.includes('badge.SetScaling("stretch-to-fit-preserve-aspect")'), "La insignia dinamica no usa el escalado nativo de Image");
assert(css.includes(".FriendsRankPopup .FriendsRankBadge") && css.includes("height: 32px"), "El badge del popup no tiene un viewport fijo");
assert(css.includes(".FriendsRankProfilePageRoot .FriendsRankMainProfile .FriendsRankBadge") && css.includes("height: 76px"), "El badge del perfil no tiene un viewport fijo");
assert(css.includes(".FriendsRankStateResolving .FriendsRankSpinner"), "El spinner no permanece visible durante la carga");
assert(css.includes("spinner_png.vtex") && css.includes("@keyframes 'FriendsRankRotate'"), "El perfil no define un spinner autonomo");
assert(css.includes("pre-transform-scale2d: 0.92"), "El placeholder del perfil no coincide con Obscurus cargado");
assert(runtime.includes('"ImageLoaded"') && runtime.includes('"ImageFailedLoad"'), "Faltan eventos de Image");
assert(runtime.includes('setRootState(root, "FriendsRankStateUnavailable", "")'), "El fallo de imagen no activa Obscurus");
assert(runtime.includes('hasClass(panel, "isLocalPlayer")'), "Falta soporte para popup local");
assert(runtime.includes("friends_rank_terminal_account"), "Falta estado terminal contra loops");
assert(!runtime.includes("rank-predict"), "Runtime contiene rank-predict obsoleto");

for (const forbidden of ["fetch(", "XMLHttpRequest", "AsyncWebRequest", ".src =", "setInterval(", "Loading...", "Rango no disponible", "Buscando rango", "127.0.0.1", "/v1/rank-card", "display=card", "helperBaseUrl", "buildHelperRankCardUrl", "buildRankDataUrl", "buildSubrankImageUrl"]) {
  assert(!runtime.includes(forbidden), `Runtime contiene referencia prohibida: ${forbidden}`);
  assert(!config.includes(forbidden), `Configuracion contiene referencia prohibida: ${forbidden}`);
}
assert(!fs.existsSync(path.join(root, "helper")), "La carpeta helper debe estar ausente");
assert(!fs.existsSync(path.join(root, "scripts", "start-helper.ps1")), "start-helper.ps1 debe estar ausente");
assert(!fs.existsSync(path.join(root, "scripts", "sync-native-rank-assets.ps1")), "sync-native-rank-assets.ps1 debe estar ausente");

for (const fragment of ["friends_rank_scoreboard.vcss_c", "friends_rank_scoreboard.vjs_c", 'snippet name="Player"', 'class="FriendsRankStatlockerSlot"', 'class="FriendsRankCommendSlot"', 'id="FriendsRankScoreboardStatlockerButton"', 'class="FriendsRankScoreboardLogo"', 'id="FriendsRankScoreboardAccountID"', 'id="FriendsRankScoreboardPlayerAccountID"', "View Statlocker Profile"]) {
  assert(scoreboardXml.includes(fragment), `scoreboard no contiene ${fragment}`);
}
for (const fragment of ["friends_rank_scoreboard.vcss_c", "friends_rank_scoreboard.vjs_c", 'snippet name="Player"', 'class="PlayerActionContainer"', 'id="FriendsRankScoreboardStatlockerButton"', 'class="FriendsRankScoreboardLogo"', 'id="PlayerName"', 'id="ShowPlayerContextMenuButton"', "View Statlocker Profile"]) {
  assert(postGameTeamXml.includes(fragment), `pantalla de equipo no contiene ${fragment}`);
}
assert(postGameTeamXml.includes('<CitadelUserName id="PlayerName" hittest="false" />'), "El nombre post-game debe conservar exactamente su estructura nativa");
assert(!postGameTeamXml.includes("FriendsRankTeamStatlocker") && !postGameTeamXml.includes("FriendsRankTeamNameRow"), "La pantalla de equipo no debe modificar la fila del nombre");
assert(!fs.existsSync(path.join(root, "panorama/layout/post_game/citadel_db_post_game_player_context_menu.xml")), "El menu contextual debe quedar completamente nativo");
assert(!fs.existsSync(path.join(root, "panorama/scripts/friends_rank_context_menu.js")), "No debe existir runtime para el menu contextual nativo");
for (const fragment of ["FriendsRankStatlockerSlot", "FriendsRankCommendSlot", "FriendsRankScoreboardButton", "border-radius: 50%", "background-color: #07130fdd", "pre-transform-scale2d: 1.12", "opacity-mask", "statlocker_logo_green.vtex", "FriendsRankScoreboardLogo", "#69e799"]) {
  assert(scoreboardCss.includes(fragment), `CSS de scoreboard no contiene ${fragment}`);
}
for (const fragment of ["accountForRow", "player_account_id", "bindScoreboardOnce", "FriendsRankPostGameTeam", "bindTarget", "SetPanelEvent", 'ExternalBrowserGoToURL', "SteamOverlayAPI.OpenURL", "https://statlocker.gg/profile"]) {
  assert(scoreboardRuntime.includes(fragment), `Runtime de scoreboard no contiene ${fragment}`);
}
for (const forbidden of ["fetch(", "XMLHttpRequest", "AsyncWebRequest", "127.0.0.1", "FriendsRankScoreboardOpenStatlocker"]) {
  assert(!scoreboardRuntime.includes(forbidden), `Runtime de scoreboard contiene referencia prohibida: ${forbidden}`);
}

assert(css.includes(".FriendsRankStateRequested .FriendsRankPlaceholder") && css.includes("visibility: collapse"), "El resultado debe ocultar el placeholder");
assert(css.includes(".FriendsRankProfileCardRoot.Loading .FriendsRankRoot"), "Loading no oculta el rango anterior por CSS");
const panoramaExports = [...runtime.matchAll(/\$\.([A-Za-z0-9_]+)\s*=\s*function/g)].map((match) => match[1]);
assert(panoramaExports.length === 1 && panoramaExports[0] === "FriendsRankRefreshProfile", `Exports Panorama inesperados: ${panoramaExports.join(", ")}`);

console.log("OK: Friends Rank v4 source invariants passed");
