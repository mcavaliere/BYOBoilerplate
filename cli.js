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

if ( argv._[0] === 'list' ) {
    global.__config = Core.loadConfig();
    global.__manifest = new GeneratorManifest( global.__config );
    Commands.list( global.__manifest );

    process.exit();
}

// Verify other arguments.
if (rawArgs.length < 2) {
    Core.printUsage();

    process.exit();
}

global.__config = Core.loadConfig();
global.__manifest = new GeneratorManifest( global.__config );





Commands.generate( global.__manifest, argv._[0], argv._[1] );
