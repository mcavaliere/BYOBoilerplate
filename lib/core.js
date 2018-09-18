import fs from 'fs';
import Generator from './generator';

const usage = `


------------------
 React Generators
------------------

  Usage:

    npm run generate thingType ThingName

  Examples:

   npm run generate view MyView
   npm run generate component MyComponent


`;

const Core = {
    initGenerators: (config) => {
        let obj = {};

        Object.keys(config.generators).forEach((name) => {
            let g = config.generators[name];
            obj[name] = new Generator(name, g, config);
        });

        return obj;
    },

	loadConfig: (configFilePath) => {
		return JSON.parse(
			fs.readFileSync(configFilePath)
		);
	},

	printUsage: () => {
		console.log( usage );
	}

};

export default Core;
