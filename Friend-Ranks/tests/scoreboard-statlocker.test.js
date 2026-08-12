"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const scoreboard = require("../panorama/scripts/friends_rank_scoreboard.js");

test("scoreboard normalizes only safe AccountIDs", () => {
  assert.equal(scoreboard.normalizeAccountText("81465520"), "81465520");
  assert.equal(scoreboard.normalizeAccountText("Account ID: 81,465,520"), "81465520");
  assert.equal(scoreboard.normalizeAccountText("{i:r:account_id}"), "");
  assert.equal(scoreboard.normalizeAccountText("99999"), "");
  assert.equal(scoreboard.normalizeAccountText("4294967296"), "");
});

test("scoreboard creates only canonical Statlocker profile URLs", () => {
  assert.equal(scoreboard.buildStatlockerUrl("81465520"), "https://statlocker.gg/profile/81465520");
  assert.equal(scoreboard.buildStatlockerUrl(""), "");
  assert.equal(scoreboard.buildStatlockerUrl("123<script>"), "");
});
