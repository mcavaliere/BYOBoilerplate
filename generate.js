import parseArgs from 'minimist';
import Core from './lib/core';
import Generator from './lib/generator';

const configPath = './config/config.json';

// console.log("----------- process.argv.length: ", process.argv.length);

let rawArgs = process.argv.slice(2);
let argv = parseArgs( rawArgs );



const config = Core.loadConfig(configPath)

// console.log("----------- loaded config: ", config);

console.log("----------- parseArgs: ", argv);
// console.log("----------- parseArgs._: ", argv._);

if (rawArgs.length < 2) {
	Core.printUsage();
	process.exit();
}

// Load all generators
const generators = Core.initGenerators(config);

console.log("----------- loaded generators: ", generators);

// Target generation task
const generatorName = argv._[0];
const generatorInstanceName = argv._[1];
