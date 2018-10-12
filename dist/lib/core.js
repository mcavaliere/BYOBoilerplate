'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _generatorManifest = require('./generatorManifest');

var _generatorManifest2 = _interopRequireDefault(_generatorManifest);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var heading = '\n\n\n--------------------------------------\n          BYOBoilerplate\n--------------------------------------\n';

var configFileAlreadyExists = '  ...config file already exists in ' + _constants2.default.CONFIG_FILE_PATH + '. Either edit it directly, or delete it to generate from scratch. ';

var templateDirectoryAlreadyExists = '  ...template directory ' + _constants2.default.TEMPLATE_FILE_PATH + ' already exists. Either edit it directly, or delete it to generate from scratch. ';

var usage = '\n' + heading + '\n\n  Usage:\n    # Install default config file\n    bgen init\n\n    # Run a configured generator\n    bgen thingType ThingName\n\n  Examples:\n\n    bgen view MyView\n    bgen component MyComponent\n\n';

var initRequirement = '\n' + heading + '\n\n  You must create a config file before running the generators.\n\n  Usage:\n    # Install default config file\n    bgen init\n';

var Core = function () {
    function Core() {
        _classCallCheck(this, Core);

        this._config = null;
    }

    _createClass(Core, [{
        key: 'loadConfig',
        value: function loadConfig() {
            return JSON.parse(_fsExtra2.default.readFileSync(_constants2.default.CONFIG_FILE_PATH));
        }
    }, {
        key: 'config',
        get: function get() {
            if (!this._config) {
                this._config = this.loadConfig();
            }

            return this._config;
        }
    }, {
        key: 'manifest',
        get: function get() {
            if (!this._manifest) {
                this._manifest = new _generatorManifest2.default(this.config);
            }

            return this._manifest;
        }
    }], [{
        key: 'configFileExists',
        value: function configFileExists() {
            return _fsExtra2.default.existsSync(_constants2.default.CONFIG_FILE_PATH);
        }
    }, {
        key: 'createConfig',
        value: function createConfig() {
            var src = _path2.default.join(global.__cwd, 'node_modules', 'byoboilerplate', _constants2.default.CONFIG_FILE_NAME);

            var dest = _path2.default.join(global.__cwd, _constants2.default.CONFIG_FILE_NAME);

            console.log('  ...copying config file ' + src + ' to ' + dest + '...');

            _fsExtra2.default.copyFileSync(src, dest);

            console.log('  ...done.\n\n');
        }
    }, {
        key: 'copyTemplates',
        value: function copyTemplates() {
            var src = _path2.default.join(global.__cwd, 'node_modules', 'byoboilerplate', _constants2.default.TEMPLATE_DIR_PATH);

            var dest = _path2.default.join(global.__cwd, _constants2.default.TEMPLATE_DIR_PATH);

            console.log('  ...copying templates from ' + src + ' to ' + dest + '...');

            _fsExtra2.default.copySync(src, dest);

            console.log('  ...done.\n\n');
        }
    }, {
        key: 'printAvailableGenerators',
        value: function printAvailableGenerators(generators) {
            var names = Object.values(generators).map(function (g) {
                return g.type;
            }).join('\n    ');
            var output = '\n  Available generators:\n\n    ' + names + '\n\n\n\n        ';

            console.log(output);
        }
    }, {
        key: 'printConfigFileAlreadyExists',
        value: function printConfigFileAlreadyExists() {
            console.log(configFileAlreadyExists);
        }
    }, {
        key: 'printTemplateDirectoryAlreadyExists',
        value: function printTemplateDirectoryAlreadyExists() {
            console.log(templateDirectoryAlreadyExists);
        }
    }, {
        key: 'printHeading',
        value: function printHeading() {
            console.log(heading);
        }
    }, {
        key: 'printInitRequirement',
        value: function printInitRequirement() {
            console.log(initRequirement);
        }
    }, {
        key: 'printUsage',
        value: function printUsage() {
            console.log(usage);
        }
    }, {
        key: 'templateDirectoryExists',
        value: function templateDirectoryExists() {
            return _fsExtra2.default.existsSync(_constants2.default.TEMPLATE_DIR_PATH);
        }
    }]);

    return Core;
}();

exports.default = Core;