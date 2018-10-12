"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _core = _interopRequireDefault(require("./core"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const Commands = {
  init: () => {
    _core.default.printHeading();

    console.log('  ...initializing ${ Constants.CONFIG_FILE_PATH } with default generators...');

    if (_core.default.configFileExists()) {
      _core.default.printConfigFileAlreadyExists();

      process.exit();
    }

    _core.default.createConfig();

    console.log('  ...initializing ${ Constants.TEMPLATE_DIR_PATH } with default generators...');

    if (_core.default.templateDirectoryExists()) {
      _core.default.printTemplateDirectoryAlreadyExists();

      process.exit();
    }

    _core.default.copyTemplates();

    console.log('  ...everything done.\n');
  },
  list: () => {
    _core.default.printHeading();

    let core = new _core.default();
    console.log('  Available generators: \n');
    core.manifest.generatorNames.forEach(g => {
      console.log('  *', g);
    });
    console.log('\n');
  },
  generate: (manifest, generatorName, instanceName) => {
    // TODO: write generatorIsValid method which checks config properties.
    if (!manifest.generatorIsRegistered(generatorName)) {
      throw "The generator \"".concat(generatorName, "\" is not registered.");
    }

    manifest.getGenerator(generatorName).generate(instanceName);
  }
};
var _default = Commands;
exports.default = _default;