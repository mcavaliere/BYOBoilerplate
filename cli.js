#!/usr/bin/env ./node_modules/byoboilerplate/node_modules/.bin/babel-node

import parseArgs from 'minimist';
import Core from './lib/core';
import Commands from './lib/commands';
import GeneratorManifest from './lib/generatorManifest';
import path from 'path';


global.__dirname = path.resolve(__dirname);
global.__cwd = process.cwd();

let rawArgs = process.argv.slice(2);
let argv = parseArgs( rawArgs );

// Make sure they run the 'init' command before running a generator.
if ( !Core.configFileExists() ) {
    if ( argv._[0] !== 'init' ) {
        Core.printInitRequirement();
        process.exit();
    } else {
        Commands.init();
        process.exit();
    }
}

// Verify other arguments.
if (rawArgs.length < 2) {
    Core.printUsage();

    process.exit();
}


const config = Core.loadConfig();
const manifest = new GeneratorManifest(config);

Commands.generate( manifest, argv._[0], argv._[1] );
