import Core from './core';

const Commands = {
    init: () => {
        Core.printHeading();

        console.log('  ...initializing ${ Constants.CONFIG_FILE_PATH } with default generators...');

        if ( Core.configFileExists() ) {
            Core.printConfigFileAlreadyExists();
            process.exit();
        }

        Core.createConfig();

        console.log('  ...initializing ${ Constants.TEMPLATE_DIR_PATH } with default generators...');

        if ( Core.templateDirectoryExists() ) {
            Core.printTemplateDirectoryAlreadyExists();
            process.exit();
        }

        Core.copyTemplates();

        console.log('  ...everything done.\n');
    },

    list: ( manifest ) => {
        Core.printHeading();

        manifest.generatorNames.forEach((g) => {
            console.log(g);
        });

        console.log('  ...done.\n');
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
