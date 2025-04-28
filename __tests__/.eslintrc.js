import * as path from "path";
module.exports = {
  root: true,
  extends: [
    path.resolve(__dirname, "..", "src", ".eslintrc.js"),
    "plugin:jest/recommended",
    "plugin:jest/style",
  ],
};
