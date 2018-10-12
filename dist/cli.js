#!/usr/bin/env node
"use strict";

var _minimist = _interopRequireDefault(require("minimist"));

var _core = _interopRequireDefault(require("./lib/core"));

var _commands = _interopRequireDefault(require("./lib/commands"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

global.__dirname = _path.default.resolve(__dirname);
global.__cwd = process.cwd();
let rawArgs = process.argv.slice(2);
let argv = (0, _minimist.default)(rawArgs);

switch (argv._[0]) {
  case 'init':
    if (_core.default.templateDirectoryExists()) {
      _core.default.printTemplateDirectoryAlreadyExists();

      process.exit();
    }

    _commands.default.init();

    break;

  case 'list':
    if (!_core.default.configFileExists()) {
      _core.default.printInitRequirement();

      process.exit();
    }

    _commands.default.list();

    break;

  default:
    const core = new _core.default(); // Verify other arguments.

    if (rawArgs.length < 2) {
      _core.default.printUsage();

      process.exit();
    }

    if (!_core.default.configFileExists()) {
      _core.default.printInitRequirement();

      process.exit();
    }

    _commands.default.generate(core.manifest, argv._[0], argv._[1]);

    break;
}