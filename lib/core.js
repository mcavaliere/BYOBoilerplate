import fs from 'fs';
import Generator from './generator';

const usage = `


------------------
 React Generators
------------------

  Usage:

    bgen thingType ThingName

  Examples:

    bgen view MyView
    bgen component MyComponent

`;

const Core = {

	loadConfig: (configFilePath) => {
		return JSON.parse(
			fs.readFileSync(configFilePath)
		);
	},

    printAvailableGenerators: ( generators ) => {
        const names = Object.values( generators ).map(g => g.type).join("\n    ");
        const output = `
  Available generators:

    ${names}



        `;

        console.log( output );
    },

	printUsage: () => {
		console.log( usage );
	}

};

export default Core;
