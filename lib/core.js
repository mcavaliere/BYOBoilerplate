import Constants from './constants';
import fs from 'fs-extra';
import path from 'path';

const heading = `


--------------------------------------
          BYOBoilerplate
--------------------------------------
`;

const configFileAlreadyExists = `  ...config file already exists in ${Constants.CONFIG_FILE_PATH}. Either edit it directly, or delete it to generate from scratch. `;

const templateDirectoryAlreadyExists = `  ...template directory ${Constants.TEMPLATE_FILE_PATH} already exists. Either edit it directly, or delete it to generate from scratch. `;

const usage = `
${heading}

  Usage:
    # Install default config file
    bgen init

    # Run a configured generator
    bgen thingType ThingName

  Examples:

    bgen view MyView
    bgen component MyComponent

`;

const initRequirement = `
${heading}

  You must create a config file before running the generators.

  Usage:
    # Install default config file
    bgen init
`;

class Core {
    static configFileExists() {
        return fs.existsSync( Constants.CONFIG_FILE_PATH );
    }

    static createConfig() {
        if ( this.configFileExists() ) {
            this.printConfigFileAlreadyExists();
            process.exit();
        }

        let src = path.join(
            global.__cwd,
            'node_modules',
            'byoboilerplate',
            Constants.CONFIG_FILE_NAME
        );

        let dest = path.join(
            global.__cwd,
            Constants.CONFIG_FILE_NAME
        );

        console.log(`  ...copying file ${src} to ${dest}...`);

        fs.copyFileSync( src, dest );

        console.log(`  ...done.\n\n`);
    }

    static copyTemplates() {
        if ( this.templateDirectoryExists() ) {
            this.printTemplateDirectoryAlreadyExists();
            process.exit();
        }

        let src = path.join(
            global.__cwd,
            'node_modules',
            'byoboilerplate',
            Constants.TEMPLATE_DIR_PATH
        );

        let dest = path.join(
            global.__cwd,
            Constants.TEMPLATE_DIR_PATH
        );

        console.log(`  ...copying templates from ${src} to ${dest}...`);

        fs.copySync( src, dest );

        console.log(`  ...done.\n\n`);
    }

    static loadConfig() {
        return JSON.parse(
            fs.readFileSync( Constants.CONFIG_FILE_PATH )
        );
    }

    static printAvailableGenerators( generators ) {
        const names = Object.values( generators ).map(g => g.type).join(`\n    `);
        const output = `
  Available generators:

    ${names}



        `;

        console.log( output );
    }

    static printConfigFileAlreadyExists() {
        console.log( configFileAlreadyExists );
    }

    static printTemplateDirectoryAlreadyExists() {
        console.log( templateDirectoryAlreadyExists );
    }

    static printHeading() {
        console.log( heading );
    }

    static printInitRequirement() {
        console.log( initRequirement );
    }

    static printUsage() {
        console.log( usage );
    }

    static templateDirectoryExists() {
        return fs.existsSync( Constants.TEMPLATE_DIR_PATH );
    }
}

export default Core;
