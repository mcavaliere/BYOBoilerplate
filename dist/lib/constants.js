"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
let Constants = {
  CONFIG_FILE_NAME: 'byobconfig.json'
};
Constants = { ...Constants,
  CONFIG_FILE_PATH: "./".concat(Constants.CONFIG_FILE_NAME),
  TEMPLATE_DIR_PATH: 'templates'
};
var _default = Constants;
exports.default = _default;