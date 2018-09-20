import parseArgs from 'minimist';
import Core from './lib/core';
import GeneratorManifest from './lib/generatorManifest';

const configPath = './byobconfig.json';

let rawArgs = process.argv.slice(2);
let argv = parseArgs( rawArgs );

const config = Core.loadConfig(configPath);
const manifest = new GeneratorManifest(config)

if (rawArgs.length < 2) {
	Core.printUsage();
	Core.printAvailableGenerators( manifest.generators );
	process.exit();
}

// Target generation task
const generatorName = argv._[0];
const generatorInstanceName = argv._[1];

if ( !manifest.generatorIsRegistered( generatorName ) ) {
	throw `The generator "${generatorName}" is not registered.`;
}

// TODO: write generatorIsValid method which checks config properties.

manifest.getGenerator( generatorName ).generate( generatorInstanceName );
