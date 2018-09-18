'use strict';

import fs from 'fs';
import path from 'path';

// Libs
import Liquid from 'liquid-node';

const templatesBaseDir = `${path.join(__dirname, 'templates/view')}`;
const outputBaseDir = 'views';
const engine = new Liquid.Engine

if (process.argv.length < 3) {
	console.log('—————-----USAGE—————-----');
	console.log("npm run generate-view ViewName");
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
let viewTemplate = fs.readFileSync(`${templatesBaseDir}/view.js.liquid`, 'utf8')
let stylesTemplate = fs.readFileSync(`${templatesBaseDir}/styles.js.liquid`, 'utf8')
let manifestTemplate = fs.readFileSync(`${templatesBaseDir}/index.js.liquid`, 'utf8')

// Set data for injecting into templates.
let templateData = {
	VIEW_NAME: itemName
}

// List of files to inject with data and output.
let fileSuffixes = [
	'view',
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

//
// Output the parsed stuff.
//
// engine.parseAndRender(viewTemplate, templateData)
// 	.then((result) => {
// 		writeFile(result, itemName, `index.js`)
// 	})
//
// engine.parseAndRender(stylesTemplate, templateData)
// 	.then((result) => {
// 		fs.appendFile(path.join('src', outputBaseDir, 'index.js'), result, 'utf8');
// 	})


function writeFile(tpl, model, filename) {
	fs.writeFileSync(path.join('src', outputBaseDir, model, filename), tpl, 'utf8');
}
