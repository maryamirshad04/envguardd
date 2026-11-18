const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node, // only Node.js globals
      },
    },
    rules: {
      // optional custom rules
    },
  },
];