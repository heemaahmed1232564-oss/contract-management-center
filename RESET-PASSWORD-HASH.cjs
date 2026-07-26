/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const fs = require("fs");
const bcrypt = require("bcryptjs");

const password = fs.readFileSync(0, "utf8").replace(/\r?\n$/, "");

if (password.length < 8) {
  process.exit(2);
}

process.stdout.write(bcrypt.hashSync(password, 12));
