import fs from 'fs';
import Liquid from 'liquid-node';
import mkdirp from 'mkdirp';
import path from 'path';

class Generator {
    constructor(type, config, coreConfig) {
        this.type = type;
        this.config = config;
        this.coreConfig = coreConfig;

        this.templates = {};
        this.engine    = new Liquid.Engine;

        this.ensureTemplateDirExists();
    }

    get templatesDir() {
        return path.join(
            __dirname,
            '..',
            this.coreConfig.templatesDir,
            this.config.templateSubDir
        );
    }

    get templateFilenames() {
        return Object.keys( this.config.templates );
    }

    outputDir(subDir) {
        return path.join(
            __dirname,
            '..',
            this.coreConfig.outputBaseDir,
            subDir
        )
    }

    ensureTemplateDirExists() {
        if ( !fs.existsSync( this.templatesDir ) ) {
            console.log(` ERROR: The template directory "${this.templatesDir}" for the generator "${this.type}" does not exist. Check the config file's "templatesDir" and "templateSubDir" properties.\n`);
            process.exit();
        }
    }

    ensureOutputDirExists(subDir) {
        mkdirp.sync(subDir);
    }

    /**
     * Generate and save all templates for the given instance name.
     * @param  {String} instanceName [description]
     * @return {Promise}              [description]
     */
    generate( instanceName ) {
        // Load the templates
        return Promise.all(
            this.templateFilenames.map(templateFileName =>
                this.loadTemplateOnce( templateFileName )
                    .then((t) => {
                        let data = { 'INSTANCE_NAME': instanceName };

                        return Promise.all([
                            this.renderTemplate(t.contents, data),
                            this.renderTemplate(t.outputSubdir, data),
                            this.renderTemplate(t.outputFilename, data)
                        ])
                            .then((arr) => {
                                let [ html, outputSubdir, outputFilename ] = arr;

                                return this.writeTemplate(
                                    outputFilename,
                                    outputSubdir,
                                    html
                                );
                            });
                    })
            )
        );
    }

    /**
     * Load a template object into this.templates, including its parsed contents and output filename.
     *
     * @param  {String} templateFilename The filename of the original template file.
     * @return {Promise}                  Resolves to the JSON object for this template inside this.templates.
     */
    loadTemplateOnce( templateFilename ) {
        if ( this.templates[ templateFilename ] ) {
            return Promise.resolve(
                this.templates[ templateFilename ]
            );
        }

        // Get the unparsed raw templates.
        let rawContentTemplate      = fs.readFileSync(`${ this.templatesDir }/${ templateFilename }`, 'utf8');
        let rawOutputSubdirTemplate = this.config.outputSubDir;
        let rawOutfileTemplate      = this.config.templates[ templateFilename ];

        // Parse them both
        return Promise.all([
            this.engine.parse( rawContentTemplate ),
            this.engine.parse( rawOutputSubdirTemplate ),
            this.engine.parse( rawOutfileTemplate )
        ])
            // Save them into the templates object, and return it.
            .then( (arr) => {
                let [ contents, outputSubdir, outputFilename ] = arr;

                this.templates[ templateFilename ] = {
                    contents,
                    outputSubdir,
                    outputFilename
                };

                return Promise.resolve(
                    this.templates[ templateFilename ]
                );
            });
    }

    /**
     * Call the template rendering function.
     * @param  {Function} template [description]
     * @param  {Object} data     [description]
     * @return {Promise}          [description]
     */
    renderTemplate( template, data ) {
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
    writeTemplate( fileName, subDir, contents ) {
        subDir = this.outputDir(subDir);

        this.ensureOutputDirExists( subDir );

        let filePath = path.join(
            subDir,
            fileName
        );

        fs.writeFileSync( filePath, contents, 'utf8');

        return Promise.resolve(true);
    }

}

export default Generator;
