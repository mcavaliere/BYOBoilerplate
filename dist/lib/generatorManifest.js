'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _core = require('./core');

var _core2 = _interopRequireDefault(_core);

var _generator = require('./generator');

var _generator2 = _interopRequireDefault(_generator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GeneratorManifest = function () {
    function GeneratorManifest(config) {
        var _this = this;

        _classCallCheck(this, GeneratorManifest);

        this._generators = {};
        this._core = new _core2.default();

        Object.keys(config.generators).forEach(function (name) {
            var g = config.generators[name];
            _this._generators[name] = new _generator2.default(name, g, config);
        });
    }

    _createClass(GeneratorManifest, [{
        key: 'generatorIsRegistered',
        value: function generatorIsRegistered(name) {
            return Object.keys(this._generators).includes(name);
        }
    }, {
        key: 'getGenerator',
        value: function getGenerator(name) {
            return this._generators[name];
        }
    }, {
        key: 'generators',
        get: function get() {
            return this._generators;
        }
    }, {
        key: 'generatorNames',
        get: function get() {
            return Object.keys(this._generators);
        }
    }]);

    return GeneratorManifest;
}();

exports.default = GeneratorManifest;