"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _generator = _interopRequireDefault(require("./generator"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class GeneratorManifest {
  constructor(config) {
    this._generators = {};
    Object.keys(config.generators).forEach(name => {
      let g = config.generators[name];
      this._generators[name] = new _generator.default(name, g, config);
    });
  }

  get generators() {
    return this._generators;
  }

  get generatorNames() {
    return Object.keys(this._generators);
  }

  generatorIsRegistered(name) {
    return Object.keys(this._generators).includes(name);
  }

  getGenerator(name) {
    return this._generators[name];
  }

}

var _default = GeneratorManifest;
exports.default = _default;