"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRankImageUrl, buildStatlockerUrl, DEFAULT_CONFIG } = require("../panorama/scripts/friends_rank.js");

test("construye el endpoint vigente de imagen de rango", () => {
  assert.equal(
    buildRankImageUrl("81465520"),
    "https://api.deadlock-api.com/v1/players/81465520/rank/image?format=webp",
  );
});

test("no construye URL para una identidad invalida", () => {
  assert.equal(buildRankImageUrl("../../rank"), "");
  assert.equal(buildRankImageUrl("{i:r:account_id}"), "");
});

test("rechaza una base sin HTTPS", () => {
  assert.equal(buildRankImageUrl("81465520", { ...DEFAULT_CONFIG, apiBaseUrl: "http://localhost" }), "");
});

test("construye exclusivamente el perfil canonico de Statlocker", () => {
  assert.equal(buildStatlockerUrl("81465520"), "https://statlocker.gg/profile/81465520");
  assert.equal(buildStatlockerUrl("../../rank"), "");
  assert.equal(buildStatlockerUrl("{i:r:account_id}"), "");
  assert.equal(buildStatlockerUrl("81465520", { ...DEFAULT_CONFIG, statlockerBaseUrl: "https://evil.example/profile" }), "");
});

test("la configuracion v4 conserva cache y entrega WebP sin bindings", () => {
  assert.equal(DEFAULT_CONFIG.cacheTtlMs, 10 * 60 * 1000);
  assert.equal(DEFAULT_CONFIG.imageFormat, "webp");
  assert.equal(DEFAULT_CONFIG.version, 16);
  assert.equal(DEFAULT_CONFIG.popupEmptyPresenceSettleMs, 1500);
  assert.equal(DEFAULT_CONFIG.debug, false);
  assert.equal(Object.hasOwn(DEFAULT_CONFIG, "statlockerPinBindingDefault"), false);
  assert.equal(Object.hasOwn(DEFAULT_CONFIG, "helperBaseUrl"), false);
});
