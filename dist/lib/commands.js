'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _core = require('./core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Commands = {
    init: function init() {
        _core2.default.printHeading();

        console.log('  ...initializing ${ Constants.CONFIG_FILE_PATH } with default generators...');

        if (_core2.default.configFileExists()) {
            _core2.default.printConfigFileAlreadyExists();
            process.exit();
        }

        _core2.default.createConfig();

        console.log('  ...initializing ${ Constants.TEMPLATE_DIR_PATH } with default generators...');

        if (_core2.default.templateDirectoryExists()) {
            _core2.default.printTemplateDirectoryAlreadyExists();
            process.exit();
        }

        _core2.default.copyTemplates();

        console.log('  ...everything done.\n');
    },

    list: function list() {
        _core2.default.printHeading();

        var core = new _core2.default();

        console.log('  Available generators: \n');

        core.manifest.generatorNames.forEach(function (g) {
            console.log('  *', g);
        });

        console.log('\n');
    },

    generate: function generate(manifest, generatorName, instanceName) {
        // TODO: write generatorIsValid method which checks config properties.
        if (!manifest.generatorIsRegistered(generatorName)) {
            throw 'The generator "' + generatorName + '" is not registered.';
        }

        manifest.getGenerator(generatorName).generate(instanceName);
    }
};

exports.default = Commands;