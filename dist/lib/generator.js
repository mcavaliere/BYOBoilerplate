'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _liquidNode = require('liquid-node');

var _liquidNode2 = _interopRequireDefault(_liquidNode);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Generator = function () {
    function Generator(type, config, coreConfig) {
        _classCallCheck(this, Generator);

        this.type = type;
        this.config = config;
        this.coreConfig = coreConfig;

        this.templates = {};
        this.engine = new _liquidNode2.default.Engine();

        // this.ensureTemplateDirExists();
    }

    _createClass(Generator, [{
        key: 'outputDir',
        value: function outputDir(subDir) {
            return _path2.default.join(process.cwd(), this.coreConfig.outputBaseDir, subDir);
        }
    }, {
        key: 'ensureTemplateDirExists',
        value: function ensureTemplateDirExists() {
            if (!_fs2.default.existsSync(this.templatesDir)) {
                console.log(' ERROR: The template directory "' + this.templatesDir + '" for the generator "' + this.type + '" does not exist. Check the config file\'s "templatesDir" and "templateSubDir" properties.\n');
                process.exit();
            }
        }
    }, {
        key: 'ensureOutputDirExists',
        value: function ensureOutputDirExists(subDir) {
            _mkdirp2.default.sync(subDir);
        }

        /**
         * Generate and save all templates for the given instance name.
         * @param  {String} instanceName [description]
         * @return {Promise}              [description]
         */

    }, {
        key: 'generate',
        value: function generate(instanceName) {
            var _this = this;

            // Load the templates
            return Promise.all(this.templateFilenames.map(function (templateFileName) {
                return _this.loadTemplateOnce(templateFileName).then(function (t) {
                    var data = { 'INSTANCE_NAME': instanceName };

                    return Promise.all([_this.renderTemplate(t.contents, data), _this.renderTemplate(t.outputSubdir, data), _this.renderTemplate(t.outputFilename, data)]).then(function (arr) {
                        var _arr = _slicedToArray(arr, 3),
                            html = _arr[0],
                            outputSubdir = _arr[1],
                            outputFilename = _arr[2];

                        return _this.writeTemplate(outputFilename, outputSubdir, html);
                    });
                });
            }));
        }

        /**
         * Load a template object into this.templates, including its parsed contents and output filename.
         *
         * @param  {String} templateFilename The filename of the original template file.
         * @return {Promise}                  Resolves to the JSON object for this template inside this.templates.
         */

    }, {
        key: 'loadTemplateOnce',
        value: function loadTemplateOnce(templateFilename) {
            var _this2 = this;

            if (this.templates[templateFilename]) {
                return Promise.resolve(this.templates[templateFilename]);
            }

            // Get the unparsed raw templates.
            var rawContentTemplate = _fs2.default.readFileSync(this.templatesDir + '/' + templateFilename, 'utf8');
            var rawOutputSubdirTemplate = this.config.outputSubDir;
            var rawOutfileTemplate = this.config.templates[templateFilename];

            // Parse them both
            return Promise.all([this.engine.parse(rawContentTemplate), this.engine.parse(rawOutputSubdirTemplate), this.engine.parse(rawOutfileTemplate)])
            // Save them into the templates object, and return it.
            .then(function (arr) {
                var _arr2 = _slicedToArray(arr, 3),
                    contents = _arr2[0],
                    outputSubdir = _arr2[1],
                    outputFilename = _arr2[2];

                _this2.templates[templateFilename] = {
                    contents: contents,
                    outputSubdir: outputSubdir,
                    outputFilename: outputFilename
                };

                return Promise.resolve(_this2.templates[templateFilename]);
            });
        }

        /**
         * Call the template rendering function.
         * @param  {Function} template [description]
         * @param  {Object} data     [description]
         * @return {Promise}          [description]
         */

    }, {
        key: 'renderTemplate',
        value: function renderTemplate(template, data) {
            return template.render(data);
        }

        /**
         * Write the contents to a file asyncronously.
         *
         * @param  {String} fileName The output filename.
         * @param  {String} subDir   The subdirectory of the generator's root directory.
         * @param  {String} contents The rendered file contents.
         * @return {Promise}          A Promise resolving to true.
         */

    }, {
        key: 'writeTemplate',
        value: function writeTemplate(fileName, subDir, contents) {
            subDir = this.outputDir(subDir);

            this.ensureOutputDirExists(subDir);

            var filePath = _path2.default.join(subDir, fileName);

            _fs2.default.writeFileSync(filePath, contents, 'utf8');

            return Promise.resolve(true);
        }
    }, {
        key: 'templatesDir',
        get: function get() {
            return _path2.default.join(process.cwd(), this.coreConfig.templatesDir, this.config.templateSubDir);
        }
    }, {
        key: 'templateFilenames',
        get: function get() {
            return Object.keys(this.config.templates);
        }
    }]);

    return Generator;
}();

exports.default = Generator;