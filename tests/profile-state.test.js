"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createProfileState } = require("../panorama/scripts/friends_rank.js");

class MockPanel {
  constructor(id, text = "") {
    this.id = id;
    this.text = text;
    this.children = [];
    this.attributes = {};
    this.classes = new Set();
    this.style = {};
    this.visible = true;
    this.valid = true;
    this.image = "";
    this.events = {};
    this.hittest = false;
    this.hittestchildren = false;
    this.enabled = true;
  }
  add(child) { child.parent = this; this.children.push(child); return child; }
  IsValid() { return this.valid; }
  Children() { return this.children.filter((child) => child.valid); }
  GetParent() { return this.parent || null; }
  FindChildTraverse(id) {
    if (!this.valid) return null;
    if (this.id === id) return this;
    for (const child of this.Children()) { const found = child.FindChildTraverse(id); if (found) return found; }
    return null;
  }
  SetAttributeString(key, value) { this.attributes[key] = String(value); }
  GetAttributeString(key, fallback) { return Object.hasOwn(this.attributes, key) ? this.attributes[key] : fallback; }
  AddClass(name) { this.classes.add(name); }
  RemoveClass(name) { this.classes.delete(name); }
  BHasClass(name) { return this.classes.has(name); }
  SetImage(url) { this.image = url; this.setImageCalls = (this.setImageCalls || 0) + 1; }
  SetScaling(value) { this.scaling = value; this.setScalingCalls = (this.setScalingCalls || 0) + 1; }
  SetFocus() { this.focused = true; }
  DeleteAsync() { this.valid = false; if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); }
  emit(name) { if (this.events[name]) this.events[name](); }
}

function createPanoramaHarness(account = "81465520", main = false, options = {}) {
  const root = new MockPanel(main ? "CitadelProfilePage" : "ProfileCard");
  if (!main && options.interactivePopup) new MockPanel("ContextMenuBody").add(root);
  if (options.localPlayer) root.AddClass("isLocalPlayer");
  const rankRoot = root.add(new MockPanel("FriendsRankRoot"));
  rankRoot.add(new MockPanel("FriendsRankPlaceholder"));
  rankRoot.add(new MockPanel("FriendsRankMediaHost"));
  root.add(new MockPanel(main ? "FriendsRankStatlockerProfileButton" : "FriendsRankStatlockerPopupButton"));
  const hidden = root.add(new MockPanel("FriendsRankHiddenAccountID", account ? `[U:1:${account}]` : ""));
  const username = root.add(new MockPanel(main ? "SelfName" : "UserName", main ? `Player FRIEND CODE: ${account}` : "Player"));
  const presence = main ? username : root.add(new MockPanel("UserRichPresence", options.presence === undefined ? "Not friends" : options.presence));
  if (main) root.add(new MockPanel("FriendsRankProfileFriendCode", account));
  else root.add(new MockPanel("FriendsRankVisibleAccountID", `Account ID: ${account}`));
  const queue = [];
  const sharedConfig = {};
  const storage = new Map(Object.entries(options.storage || {}));
  const openedUrls = [];
  let createdPanels = 0;
  let currentTime = 1000;
  const MockDate = { now: () => currentTime };
  const dollar = {
    GetContextPanel: () => root,
    Schedule: (delay, callback) => queue.push({ delay, callback }),
    CreatePanel: (_type, parent, id) => { createdPanels += 1; return parent.add(new MockPanel(id)); },
    RegisterEventHandler: (name, panel, callback) => { panel.events[name] = callback; },
    ...(options.browserEvent === false ? {} : {
      DispatchEvent: (name, url) => {
        if (name === "ExternalBrowserGoToURL") openedUrls.push(url);
      },
    }),
    persistentStorage: {
      getItem: (key) => storage.get(key) || "",
      setItem: (key, value) => storage.set(key, String(value)),
    },
    Msg: () => {},
    FriendsRankConfig: { debug: false, popupReadyTimeoutMs: 5000, popupGuardIntervalSeconds: 0.016, failureCooldownMs: 15000 },
  };
  const sandbox = {
    $: dollar,
    GameUI: { CustomUIConfig: () => sharedConfig },
    Date: MockDate,
    encodeURIComponent,
    isFinite,
    ...(options.overlay === false ? {} : { SteamOverlayAPI: { OpenURL: (url) => openedUrls.push(url) } }),
  };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, "../panorama/scripts/friends_rank.js"), "utf8"), sandbox);
  queue.length = 0;
  return {
    root, hidden, username, presence, rankRoot, dollar, queue, sharedConfig, openedUrls,
    createdPanels: () => createdPanels,
    badge: () => root.FindChildTraverse("FriendsRankMediaHost").Children()[0] || null,
    runNext() { const task = queue.shift(); if (!task) return false; currentTime += task.delay * 1000; task.callback(); return true; },
    run(count = 20) { for (let index = 0; index < count && this.runNext(); index += 1); },
    advance(ms) { currentTime += ms; },
  };
}

test("una operación anterior no puede sobrescribir el perfil actual", () => {
  const profile = createProfileState(600000);
  const tokenA = profile.begin();
  const tokenB = profile.begin();
  assert.equal(profile.commit(tokenA, "81465520", "https://example/a", 100), false);
  assert.equal(profile.commit(tokenB, "110064047", "https://example/b", 110), true);
});

test("begin limpia el estado visible y la caché respeta TTL", () => {
  const profile = createProfileState(600000);
  const token = profile.begin();
  profile.commit(token, "81465520", "https://example/a", 1000);
  assert.equal(profile.lookup("81465520", 600999).url, "https://example/a");
  assert.equal(profile.lookup("81465520", 601001), null);
  profile.begin();
  assert.equal(profile.state.renderedAccount, "");
});

test("popup espera dos identidades estables y solo aparece después de ImageLoaded", () => {
  const ui = createPanoramaHarness();
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  assert.equal(ui.rankRoot.visible, false);
  ui.run(10);
  const badge = ui.badge();
  assert.equal(badge.image, "https://api.deadlock-api.com/v1/players/81465520/rank/image?format=webp");
  assert.equal(badge.scaling, "stretch-to-fit-preserve-aspect");
  assert.equal(badge.setScalingCalls, 1);
  assert.equal(badge.visible, false);
  badge.emit("ImageLoaded");
  assert.equal(badge.visible, true);
  assert.equal(ui.root.attributes.friends_rank_rendered_account, "81465520");
});

test("A→B elimina A y un ImageLoaded tardío no puede reaparecer", () => {
  const ui = createPanoramaHarness("81465520");
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(10);
  const badgeA = ui.badge();
  ui.hidden.text = "[U:1:110064047]";
  ui.root.FindChildTraverse("FriendsRankVisibleAccountID").text = "Account ID: 110064047";
  ui.username.text = "Player B";
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  assert.equal(badgeA.valid, false);
  badgeA.emit("ImageLoaded");
  assert.equal(ui.root.attributes.friends_rank_rendered_account, "");
  for (let index = 0; index < 10 && !ui.badge(); index += 1) ui.runNext();
  const badgeB = ui.badge();
  assert.equal(badgeB.image, "https://api.deadlock-api.com/v1/players/110064047/rank/image?format=webp");
  badgeB.emit("ImageLoaded");
  assert.equal(ui.root.attributes.friends_rank_rendered_account, "110064047");
});

test("popup espera Loading→listo y la presencia nativa", () => {
  const ui = createPanoramaHarness();
  ui.root.AddClass("Loading");
  ui.presence.text = "";
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(3);
  assert.equal(ui.badge(), null);
  ui.root.RemoveClass("Loading");
  ui.presence.text = "Not friends";
  ui.run(10);
  assert.ok(ui.badge());
});

test("popup local confirma AccountID y username aunque presencia este vacia", () => {
  const ui = createPanoramaHarness("81465520", false, { localPlayer: true, presence: "" });
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(10);
  assert.ok(ui.badge());
  ui.badge().emit("ImageLoaded");
  assert.equal(ui.root.attributes.friends_rank_rendered_account, "81465520");
});

test("popup ajeno sin presencia espera mas tiempo antes de resolver", () => {
  const ui = createPanoramaHarness("81465520", false, { presence: "" });
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(10);
  assert.equal(ui.badge(), null);
  ui.run(10);
  assert.ok(ui.badge(), "una identidad inactiva estable debe mostrar su rango u Obscurus");
});

test("un cambio tardio de presencia no recarga un rango ya visible", () => {
  const ui = createPanoramaHarness("81465520", false, { presence: "Online" });
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(10);
  const badge = ui.badge();
  badge.emit("ImageLoaded");
  const created = ui.createdPanels();

  ui.presence.text = "Not friends";
  ui.run(10);
  assert.equal(ui.badge(), badge);
  assert.equal(badge.valid, true);
  assert.equal(badge.visible, true);
  assert.equal(ui.createdPanels(), created);
});

test("onmouseover repetido es idempotente durante y despues de cargar", () => {
  const ui = createPanoramaHarness("81465520", false, { presence: "Not friends" });
  const firstToken = ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  assert.equal(ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover"), firstToken);
  ui.run(10);
  const badge = ui.badge();
  assert.ok(badge);
  const created = ui.createdPanels();
  assert.equal(ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover"), firstToken);
  badge.emit("ImageLoaded");
  assert.equal(ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover"), firstToken);
  assert.equal(ui.badge(), badge);
  assert.equal(ui.createdPanels(), created);
});

test("popup espera 750 ms sin cambios despues de la presencia definitiva", () => {
  const ui = createPanoramaHarness("81465520", false, { presence: "Online" });
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(5);
  assert.equal(ui.badge(), null);
  ui.presence.text = "Not friends";
  ui.run(7);
  assert.equal(ui.badge(), null, "un estado intermedio no debe crear una imagen");
  ui.run(2);
  assert.ok(ui.badge());
});

test("A se oculta al comenzar Loading aunque no haya otro mouseover", () => {
  const ui = createPanoramaHarness("81465520");
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(10);
  const badgeA = ui.badge();
  badgeA.emit("ImageLoaded");
  assert.equal(badgeA.visible, true);

  ui.root.AddClass("Loading");
  ui.runNext();
  assert.equal(ui.rankRoot.visible, false);
  assert.equal(badgeA.valid, false);

  ui.hidden.text = "[U:1:110064047]";
  ui.root.FindChildTraverse("FriendsRankVisibleAccountID").text = "Account ID: 110064047";
  ui.username.text = "Player B";
  ui.presence.text = "Not friends";
  ui.root.RemoveClass("Loading");
  for (let index = 0; index < 10 && !ui.badge(); index += 1) ui.runNext();
  assert.equal(ui.badge().image, "https://api.deadlock-api.com/v1/players/110064047/rank/image?format=webp");
  badgeA.emit("ImageLoaded");
  assert.equal(ui.root.attributes.friends_rank_rendered_account, "");
});

test("si no hay identidad fresca en cinco segundos el popup queda oculto", () => {
  const ui = createPanoramaHarness();
  ui.root.attributes.friends_rank_confirmed_fingerprint = "81465520|Player||false";
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(60);
  assert.equal(ui.rankRoot.visible, false);
  assert.equal(ui.badge(), null);
});

test("perfil principal muestra loader y espera Friend Code tardío", () => {
  const ui = createPanoramaHarness("", true);
  ui.dollar.FriendsRankRefreshProfile("profile_page_mouseover");
  assert.equal(ui.rankRoot.visible, true);
  ui.run(2);
  ui.hidden.text = "[U:1:297227516]";
  ui.root.FindChildTraverse("FriendsRankProfileFriendCode").text = "297227516";
  ui.username.text = "Slade FRIEND CODE: 297227516";
  ui.run(6);
  assert.equal(ui.badge().image, "https://api.deadlock-api.com/v1/players/297227516/rank/image?format=webp");
});

test("fallo de API no recupera una imagen anterior ni entra en loop", () => {
  const ui = createPanoramaHarness();
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(10);
  ui.badge().emit("ImageFailedLoad");
  assert.equal(ui.rankRoot.classes.has("FriendsRankStateUnavailable"), true);
  assert.equal(ui.rankRoot.visible, true, "Obscurus debe permanecer visible tras el fallo");
  assert.equal(ui.rankRoot.style.visibility, "visible");
  assert.equal(ui.badge(), null);
  const createdAfterFailure = ui.createdPanels();
  ui.run(100);
  assert.equal(ui.createdPanels(), createdAfterFailure, "el watcher no debe recrear Image en loop");
  assert.equal(ui.root.attributes.friends_rank_terminal_account, "81465520");
});

test("reabrir el mismo popup sin rango restaura Obscurus sin otra solicitud", () => {
  const ui = createPanoramaHarness();
  const token = ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(10);
  ui.badge().emit("ImageFailedLoad");
  const createdAfterFailure = ui.createdPanels();

  // Simula que Deadlock colapsa los hijos al cerrar el popup reutilizado.
  ui.rankRoot.visible = false;
  ui.rankRoot.style.visibility = "collapse";

  assert.equal(ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover"), token);
  assert.equal(ui.rankRoot.visible, true);
  assert.equal(ui.rankRoot.style.visibility, "visible");
  assert.equal(ui.rankRoot.classes.has("FriendsRankStateUnavailable"), true);
  assert.equal(ui.createdPanels(), createdAfterFailure, "no debe volver a consultar la misma cuenta");
});

test("perfil principal abre el AccountID confirmado en Statlocker", () => {
  const ui = createPanoramaHarness("81465520", true);
  ui.dollar.FriendsRankRefreshProfile("profile_page_mouseover");
  ui.run(6);
  const button = ui.root.FindChildTraverse("FriendsRankStatlockerProfileButton");
  assert.equal(button.visible, true);
  assert.equal(button.hittest, true);
  assert.equal(ui.dollar.FriendsRankRefreshProfile("open_statlocker"), "opened");
  assert.deepEqual(ui.openedUrls, ["https://statlocker.gg/profile/81465520"]);
});

test("perfil principal no confirma la identidad anterior durante la navegacion", () => {
  const ui = createPanoramaHarness("81465520", true);
  ui.dollar.FriendsRankRefreshProfile("profile_page_mouseover");
  ui.run(3);
  assert.equal(ui.badge(), null, "el perfil anterior no debe renderizarse durante el settle");
  ui.hidden.text = "[U:1:236587509]";
  ui.root.FindChildTraverse("FriendsRankProfileFriendCode").text = "236587509";
  ui.username.text = "Xiao Xiao FRIEND CODE: 236587509";
  ui.run(6);
  assert.equal(ui.badge().image, "https://api.deadlock-api.com/v1/players/236587509/rank/image?format=webp");
});

test("popup persistente abre Statlocker directamente tras confirmar la identidad", () => {
  const ui = createPanoramaHarness("81465520", false, { presence: "Not friends", interactivePopup: true });
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(10);
  const button = ui.root.FindChildTraverse("FriendsRankStatlockerPopupButton");
  assert.equal(button.visible, true);
  assert.equal(button.hittest, true);
  assert.equal(ui.dollar.FriendsRankRefreshProfile("open_statlocker"), "opened");
  assert.deepEqual(ui.openedUrls, ["https://statlocker.gg/profile/81465520"]);
});

test("tooltip temporal conserva rango pero no muestra ni abre Statlocker", () => {
  const ui = createPanoramaHarness("81465520", false, { presence: "Not friends" });
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(10);
  const button = ui.root.FindChildTraverse("FriendsRankStatlockerPopupButton");
  assert.equal(button.visible, false);
  assert.equal(button.hittest, false);
  assert.equal(ui.dollar.FriendsRankRefreshProfile("open_statlocker"), "");
  assert.deepEqual(ui.openedUrls, []);
});

test("cambio A a B invalida inmediatamente el enlace anterior", () => {
  const ui = createPanoramaHarness("81465520", false, { presence: "Not friends" });
  ui.dollar.FriendsRankRefreshProfile("profile_card_mouseover");
  ui.run(10);
  ui.root.AddClass("Loading");
  ui.runNext();
  assert.equal(ui.root.attributes.friends_rank_statlocker_account, "");
  assert.equal(ui.root.FindChildTraverse("FriendsRankStatlockerPopupButton").visible, false);
});

test("sin SteamOverlayAPI usa el evento de navegador externo de Deadlock", () => {
  const ui = createPanoramaHarness("81465520", true, { overlay: false });
  ui.dollar.FriendsRankRefreshProfile("profile_page_mouseover");
  ui.run(6);
  const button = ui.root.FindChildTraverse("FriendsRankStatlockerProfileButton");
  assert.equal(button.visible, true);
  assert.equal(button.hittest, true);
  assert.equal(ui.dollar.FriendsRankRefreshProfile("open_statlocker"), "opened");
  assert.deepEqual(ui.openedUrls, ["https://statlocker.gg/profile/81465520"]);
});

test("sin ningun canal para URL la accion Statlocker permanece oculta", () => {
  const ui = createPanoramaHarness("81465520", true, { overlay: false, browserEvent: false });
  ui.dollar.FriendsRankRefreshProfile("profile_page_mouseover");
  ui.run(4);
  const button = ui.root.FindChildTraverse("FriendsRankStatlockerProfileButton");
  assert.equal(button.visible, false);
  assert.equal(button.hittest, false);
  assert.equal(ui.dollar.FriendsRankRefreshProfile("open_statlocker"), "");
});
