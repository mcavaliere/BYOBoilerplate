#!/usr/bin/env node
'use strict';

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

var _core = require('./lib/core');

var _core2 = _interopRequireDefault(_core);

var _commands = require('./lib/commands');

var _commands2 = _interopRequireDefault(_commands);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

global.__dirname = _path2.default.resolve(__dirname);
global.__cwd = process.cwd();

var rawArgs = process.argv.slice(2);
var argv = (0, _minimist2.default)(rawArgs);

switch (argv._[0]) {
    case 'init':
        if (_core2.default.templateDirectoryExists()) {
            _core2.default.printTemplateDirectoryAlreadyExists();
            process.exit();
        }
        _commands2.default.init();
        break;

    case 'list':
        if (!_core2.default.configFileExists()) {
            _core2.default.printInitRequirement();
            process.exit();
        }

        _commands2.default.list();
        break;

    default:
        var core = new _core2.default();

        // Verify other arguments.
        if (rawArgs.length < 2) {
            _core2.default.printUsage();
            process.exit();
        }

        if (!_core2.default.configFileExists()) {
            _core2.default.printInitRequirement();
            process.exit();
        }
        _commands2.default.generate(core.manifest, argv._[0], argv._[1]);
        break;
}