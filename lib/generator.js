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

		this.ensureTemplateDirExists();

		this.engine = new Liquid.Engine;
	}

	get templatesDir() {
		return path.join(
			__dirname,
			'..',
			this.coreConfig.templatesDir,
			this.config.templateSubDir
		)
	}

	get outputDir() {
		return path.join(
			__dirname,
			'..',
			this.coreConfig.outputBaseDir,
			this.config.outputSubDir
		)
	}

	ensureTemplateDirExists() {
		if ( !fs.existsSync( this.templatesDir ) ) {
			console.log(` ERROR: The template directory "${this.templatesDir}" for the model "${this.type}" does not exist. Check the config file's "templatesDir" and "templateSubDir" properties.\n`);
			process.exit();
		}
	}

	ensureOutputDirExists() {
		mkdirp.sync(this.outputDir);
	}

	generate( instanceName ) {
		// Load the templates
		Object.entries( this.config.templates ).map((pair) => {
			let [ templateFileName, outputFileName ] = pair;

			return this.loadTemplateOnce( templateFileName, outputFileName ).then((t) => {
				// console.log("----------- loadTemplateOnce callback: ", t);
				// return this.writeTemplate(template);
			});
		});
	}

	loadTemplateOnce( tplFilename, outputFilename ) {
		if ( this.templates[ tplFilename ] ) {
			return Promise.resolve(
				this.templates[ tplFilename ]
			);
		}

		let raw = fs.readFileSync(`${ this.templatesDir }/${ tplFilename }`, 'utf8');

		return this.engine.parse( raw ).then((result) => {
			this.templates[ tplFilename ] = {
				raw,
				parsed: result
			};

			return this.templates[ tplFilename ];
		})
	}

	writeTemplate( name, data ) {
		console.log("----------- writeTemplat");
	}







}

export default Generator;
