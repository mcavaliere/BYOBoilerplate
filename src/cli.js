#!/usr/bin/env node

import parseArgs from 'minimist';
import Core from './lib/core';
import Commands from './lib/commands';
import path from 'path';

global.__dirname = path.resolve(__dirname);
global.__cwd = process.cwd();

let rawArgs = process.argv.slice(2);
let argv = parseArgs( rawArgs );

switch ( argv._[0] ) {
    case 'init':
        if ( Core.templateDirectoryExists() ) {
            Core.printTemplateDirectoryAlreadyExists();
            process.exit();
        }
        Commands.init();
        break;

    case 'list':
        if ( !Core.configFileExists() ) {
            Core.printInitRequirement();
            process.exit();
        }
        
        Commands.list();
        break;

    default:
        const core = new Core();

        // Verify other arguments.
        if (rawArgs.length < 2) {
            Core.printUsage();
            process.exit();
        }

        if ( !Core.configFileExists() ) {
            Core.printInitRequirement();
            process.exit();
        }
        Commands.generate( core.manifest, argv._[0], argv._[1] );
        break;
}
