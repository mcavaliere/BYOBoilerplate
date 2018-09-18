'use strict';

import fs from 'fs';
import path from 'path';

// Libs
import Liquid from 'liquid-node';

const templatesBaseDir = `${path.join(__dirname, 'templates/component')}`;
const outputBaseDir = 'components';
const engine = new Liquid.Engine

if (process.argv.length < 3) {
	console.log('—————-----USAGE—————-----');
	console.log("npm run generate-component ComponentName");
	console.log('—————----------—————-----');
	process.exit()
}

// Process command-line argumnents,
let itemName = process.argv[2];


// Create the directory structure.
if ( !fs.existsSync( path.join('src', outputBaseDir) ) ) {
    fs.mkdirSync( path.join('src', outputBaseDir) );
}
if ( !fs.existsSync( path.join('src', outputBaseDir, itemName) ) ) {
	fs.mkdirSync( path.join('src', outputBaseDir, itemName) );
}

// Read in the templates.
let viewTemplate = fs.readFileSync(`${templatesBaseDir}/component.js.liquid`, 'utf8')
let stylesTemplate = fs.readFileSync(`${templatesBaseDir}/styles.js.liquid`, 'utf8')
let manifestTemplate = fs.readFileSync(`${templatesBaseDir}/index.js.liquid`, 'utf8')

// Set data for injecting into templates.
let templateData = {
	COMPONENT_NAME: itemName
}

// List of files to inject with data and output.
let fileSuffixes = [
	'component',
	'styles'
]

// Do the data merge and write the files.
fileSuffixes.forEach((suffix) => {
	let tpl = fs.readFileSync(`${templatesBaseDir}/${suffix}.js.liquid`, 'utf8')

	engine.parseAndRender(tpl, templateData)
		.then((result) => {
			writeFile(result, itemName, `${itemName}.${suffix}.js`)
		})
})

// Append to the manifest
engine.parseAndRender(manifestTemplate, templateData)
	.then((result) => {
		fs.appendFile(path.join('src', outputBaseDir, 'index.js'), result, 'utf8');
	})


function writeFile(tpl, model, filename) {
	fs.writeFileSync(path.join('src', outputBaseDir, model, filename), tpl, 'utf8');
}
