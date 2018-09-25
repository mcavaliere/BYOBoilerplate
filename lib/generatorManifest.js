import Generator from './generator';

class GeneratorManifest {
    constructor( config ) {
        this._generators = {};

        Object.keys(config.generators).forEach((name) => {
            let g = config.generators[name];
            this._generators[name] = new Generator(name, g, config);
        });
    }

    get generators() {
        return this._generators;
    }

    generatorIsRegistered( name ) {
        return Object.keys( this._generators ).includes( name );
    }

    getGenerator( name ) {
        return this._generators[ name ];
    }
}

export default GeneratorManifest;
