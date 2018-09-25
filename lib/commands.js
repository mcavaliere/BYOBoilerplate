import Core from './core';

const Commands = {
    init: () => {
        Core.printHeading();

        console.log('  ...initializing ${ Constants.CONFIG_FILE_PATH } with default generators...');
        Core.createConfig();

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
