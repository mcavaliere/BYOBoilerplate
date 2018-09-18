import mkdirp from 'mkdirp';
import fs from 'fs';

class Generator {
	constructor(type, config, coreConfig) {
		this.type = type;
		this.config = config;
		this.coreConfig = coreConfig;

		this.ensureDirsExist();
	}

	get templatesDir() {
		return path.join(
			this.coreConfig.templatesDir,
			this.config.templateSubDir
		)
	}

	get outputDir() {
		return path.join(
			this.coreConfig.outputBaseDir,
			this.config.outputSubDir
		)
	}

	ensureDirsExist() {
		if ( !fs.existsSync( this.templatesDir ) ) {
			throw 'The template directory ${this.templatesDir} indicated in the config file does not exist.';
		}

		mkdirp.existsSync(this.outputDir)
	}

	




}

export default Generator;
