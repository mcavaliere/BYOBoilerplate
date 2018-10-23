"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _constants = _interopRequireDefault(require("./constants"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _path = _interopRequireDefault(require("path"));

var _generatorManifest = _interopRequireDefault(require("./generatorManifest"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const heading = "\n\n\n--------------------------------------\n          BYOBoilerplate\n--------------------------------------\n";
const configFileAlreadyExists = "  ...config file already exists in ".concat(_constants.default.CONFIG_FILE_PATH, ". Either edit it directly, or delete it to generate from scratch. ");
const templateDirectoryAlreadyExists = "  ...template directory ".concat(_constants.default.TEMPLATE_FILE_PATH, " already exists. Either edit it directly, or delete it to generate from scratch. ");
const usage = "\n".concat(heading, "\n\n  Usage:\n    # Install default config file\n    bgen init\n\n    # Run a configured generator\n    bgen thingType ThingName\n\n  Examples:\n\n    bgen view MyView\n    bgen component MyComponent\n\n");
const initRequirement = "\n".concat(heading, "\n\n  You must create a config file before running the generators.\n\n  Usage:\n    # Install default config file\n    bgen init\n");

class Core {
  constructor() {
    this._config = null;
  }

  get config() {
    if (!this._config) {
      this._config = this.loadConfig();
    }

    return this._config;
  }

  get manifest() {
    if (!this._manifest) {
      this._manifest = new _generatorManifest.default(this.config);
    }

    return this._manifest;
  }

  static configFileExists() {
    return _fsExtra.default.existsSync(_constants.default.CONFIG_FILE_PATH);
  }

  static createConfig() {
    let src = _path.default.join(global.__cwd, 'node_modules', 'byoboilerplate', _constants.default.CONFIG_FILE_NAME);

    let dest = _path.default.join(global.__cwd, _constants.default.CONFIG_FILE_NAME);

    console.log("  ...copying config file ".concat(src, " to ").concat(dest, "..."));

    _fsExtra.default.copyFileSync(src, dest);

    console.log("  ...done.\n\n");
  }

  static copyTemplates() {
    let src = _path.default.join(global.__cwd, 'node_modules', 'byoboilerplate', _constants.default.TEMPLATE_DIR_PATH);

    let dest = _path.default.join(global.__cwd, _constants.default.TEMPLATE_DIR_PATH);

    console.log("  ...copying templates from ".concat(src, " to ").concat(dest, "..."));

    _fsExtra.default.copySync(src, dest);

    console.log("  ...done.\n\n");
  }

  loadConfig() {
    return JSON.parse(_fsExtra.default.readFileSync(_constants.default.CONFIG_FILE_PATH));
  }

  static printAvailableGenerators(generators) {
    const names = Object.values(generators).map(g => g.type).join("\n    ");
    const output = "\n  Available generators:\n\n    ".concat(names, "\n\n\n\n        ");
    console.log(output);
  }

  static printConfigFileAlreadyExists() {
    console.log(configFileAlreadyExists);
  }

  static printTemplateDirectoryAlreadyExists() {
    console.log(templateDirectoryAlreadyExists);
  }

  static printHeading() {
    console.log(heading);
  }

  static printInitRequirement() {
    console.log(initRequirement);
  }

  static printUsage() {
    console.log(usage);
  }

  static templateDirectoryExists() {
    return _fsExtra.default.existsSync(_constants.default.TEMPLATE_DIR_PATH);
  }

}

var _default = Core;
exports.default = _default;