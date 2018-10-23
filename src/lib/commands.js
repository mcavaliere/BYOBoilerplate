import Core from './core';
import Constants from './constants';

const Commands = {
    init: () => {
        Core.printHeading();

        console.log(`  ...initializing ${ Constants.CONFIG_FILE_PATH } with default generators...`);

        if ( Core.configFileExists() ) {
            Core.printConfigFileAlreadyExists();
            process.exit();
        }

        Core.createConfig();

        console.log(`  ...initializing ${ Constants.TEMPLATE_DIR_PATH } with default generators...`);

        if ( Core.templateDirectoryExists() ) {
            Core.printTemplateDirectoryAlreadyExists();
            process.exit();
        }

        Core.copyTemplates();

        console.log('  ...everything done.\n');
    },

    list: () => {
        Core.printHeading();

        let core = new Core();

        console.log('  Available generators: \n');

        core.manifest.generatorNames.forEach((g) => {
            console.log('  *', g);
        });

        console.log('\n');

    },

    generate: ( manifest, generatorName, instanceName ) => {
        // TODO: write generatorIsValid method which checks config properties.
        if ( !manifest.generatorIsRegistered( generatorName ) ) {
            throw `The generator "${generatorName}" is not registered.`;
        }

        manifest.getGenerator( generatorName ).generate( instanceName );
    }
};

export default Commands;
