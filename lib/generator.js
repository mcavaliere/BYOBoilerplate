import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

class Generator {
	constructor(type, config, coreConfig) {
		this.type = type;
		this.config = config;
		this.coreConfig = coreConfig;

		this.ensureTemplateDirExists();
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






}

export default Generator;
