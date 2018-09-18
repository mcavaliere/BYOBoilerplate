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

	loadConfig: (configFilePath) => {
		return JSON.parse(
			fs.readFileSync(configFilePath)
		);
	},

    printAvailableGenerators: ( generators ) => {
        const names = generators.map(g => g.type).join("\n    ");
        const output = `

  Available generators: ${names}



        `;

        console.log( output );
    },

	printUsage: () => {
		console.log( usage );
	}

};

export default Core;
