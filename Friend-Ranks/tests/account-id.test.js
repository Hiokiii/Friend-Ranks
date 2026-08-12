"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const rank = require("../panorama/scripts/friends_rank.js");

test("normaliza AccountID y SteamID3", () => {
  assert.equal(rank.normalizeAccountText("81465520"), "81465520");
  assert.equal(rank.normalizeAccountText("[U:1:81465520]"), "81465520");
  assert.equal(rank.normalizeAccountText("Account ID: [U:1:81465520]"), "81465520");
  assert.equal(rank.normalizeAccountText("Account ID: 81,465,520"), "81465520");
  assert.equal(rank.normalizeAccountText("FRIEND CODE: 297227516"), "297227516");
});

test("convierte SteamID64 como decimal exacto", () => {
  assert.equal(rank.normalizeAccountText("76561198041731248"), "81465520");
  assert.equal(rank.steam64ToAccountId("76561202255233023", rank.DEFAULT_CONFIG), "4294967295");
});

test("rechaza límites, marcadores y valores ambiguos", () => {
  for (const value of ["", "0", "99999", "4294967296", "nan", "#token", "{i:r:account_id}"]) {
    assert.equal(rank.normalizeAccountText(value), "", value);
  }
  assert.equal(rank.normalizeAccountText("Account ID: 81465520 / 110064047"), "");
  assert.equal(rank.normalizeAccountText("76561197960265727"), "");
});

test("la fuente oculta es prioritaria y una contradicción bloquea el render", () => {
  assert.deepEqual(rank.reconcileAccounts("[U:1:81465520]", "Account ID"), {
    account: "81465520",
    hidden: "81465520",
    visible: "",
    mismatch: false,
  });
  assert.deepEqual(rank.reconcileAccounts("[U:1:81465520]", "Account ID: 110064047"), {
    account: "",
    hidden: "81465520",
    visible: "110064047",
    mismatch: true,
  });
});
