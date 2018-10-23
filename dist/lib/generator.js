"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _liquidNode = _interopRequireDefault(require("liquid-node"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Generator {
  constructor(type, config, coreConfig) {
    this.type = type;
    this.config = config;
    this.coreConfig = coreConfig;
    this.templates = {};
    this.engine = new _liquidNode.default.Engine(); // this.ensureTemplateDirExists();
  }

  get templatesDir() {
    return _path.default.join(process.cwd(), this.coreConfig.templatesDir, this.config.templateSubDir);
  }

  get templateFilenames() {
    return Object.keys(this.config.templates);
  }

  outputDir(subDir) {
    return _path.default.join(process.cwd(), this.coreConfig.outputBaseDir, subDir);
  }

  ensureTemplateDirExists() {
    if (!_fs.default.existsSync(this.templatesDir)) {
      console.log(" ERROR: The template directory \"".concat(this.templatesDir, "\" for the generator \"").concat(this.type, "\" does not exist. Check the config file's \"templatesDir\" and \"templateSubDir\" properties.\n"));
      process.exit();
    }
  }

  ensureOutputDirExists(subDir) {
    _mkdirp.default.sync(subDir);
  }
  /**
   * Generate and save all templates for the given instance name.
   * @param  {String} instanceName [description]
   * @return {Promise}              [description]
   */


  generate(instanceName) {
    // Load the templates
    return Promise.all(this.templateFilenames.map(templateFileName => this.loadTemplateOnce(templateFileName).then(t => {
      let data = {
        'INSTANCE_NAME': instanceName
      };
      return Promise.all([this.renderTemplate(t.contents, data), this.renderTemplate(t.outputSubdir, data), this.renderTemplate(t.outputFilename, data)]).then(arr => {
        let [html, outputSubdir, outputFilename] = arr;
        return this.writeTemplate(outputFilename, outputSubdir, html);
      });
    })));
  }
  /**
   * Load a template object into this.templates, including its parsed contents and output filename.
   *
   * @param  {String} templateFilename The filename of the original template file.
   * @return {Promise}                  Resolves to the JSON object for this template inside this.templates.
   */


  loadTemplateOnce(templateFilename) {
    if (this.templates[templateFilename]) {
      return Promise.resolve(this.templates[templateFilename]);
    } // Get the unparsed raw templates.


    let rawContentTemplate = _fs.default.readFileSync("".concat(this.templatesDir, "/").concat(templateFilename), 'utf8');

    let rawOutputSubdirTemplate = this.config.outputSubDir;
    let rawOutfileTemplate = this.config.templates[templateFilename]; // Parse them both

    return Promise.all([this.engine.parse(rawContentTemplate), this.engine.parse(rawOutputSubdirTemplate), this.engine.parse(rawOutfileTemplate)]) // Save them into the templates object, and return it.
    .then(arr => {
      let [contents, outputSubdir, outputFilename] = arr;
      this.templates[templateFilename] = {
        contents,
        outputSubdir,
        outputFilename
      };
      return Promise.resolve(this.templates[templateFilename]);
    });
  }
  /**
   * Call the template rendering function.
   * @param  {Function} template [description]
   * @param  {Object} data     [description]
   * @return {Promise}          [description]
   */


  renderTemplate(template, data) {
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


  writeTemplate(fileName, subDir, contents) {
    subDir = this.outputDir(subDir);
    this.ensureOutputDirExists(subDir);

    let filePath = _path.default.join(subDir, fileName);

    _fs.default.writeFileSync(filePath, contents, 'utf8');

    return Promise.resolve(true);
  }

}

var _default = Generator;
exports.default = _default;