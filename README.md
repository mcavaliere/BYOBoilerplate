# BYOBoilerplate

**[ALPHA]** Simple, customizable code generators for any damn language you'd like. 

Inspired by the `rails generate` command. Written in NodeJS. Uses the Liquid templating language. 


<p align="center">
<img src="byoboilerplate.jpg" width="200" />
</p>
	


### What is it?

BYOBoilerplate lets you generate boilerplate code easily, however you like it. 

### Why I created it

I'm a React / Redux programmer, and I find myself repeatedly copying and pasting folder structure to create a new component, view, set of reducers, and so on, then changing the finer details in each one. And I don't always want to use a full library like Ignite. 

### Whom should use it

Use BYOBoilerplate: 

* ...if you hate copy-pasting files, and making small alterations.
* ...for code you can't, or don't want to put in a module.

### Usage Examples (React / ES6):

These are sample generators that come packaged with BYOBoilerplate. They're written for React / Redux, just because I use those things a lot. Write your own, for any language. 


**`npm run generate component MyComponent`**
```
src
└── components
    └── MyComponent
        ├── MyComponent.component.js
        ├── MyComponent.styles.js
        └── index.js
```
Roll your own. Configure it any way you want. 

**`npm run generate thing MyThing`**
```
outputFolder
└── things
    └── MyThing
        ├── thing-file-type-1.whatever1
        ├── thing-file-type-2.whatever2

```
### Configuration

1. Add your code templates (written in Liquid) to a folder of your choosing (`/templates` by default). 

1. Edit the packaged `byobconfig.json` to create or modify your generator settings. See the example `byobconfig.json` below. 

1. Generate some code! `npm run generate **generatorName** **instanceName**. `

1. Have a beer, you just saved some time. 


### Sample `byobconfig.json`

This comes packaged with BYOBoilerplate. Add or edit as needed. 

```
{
	"templatesDir": "templates",
	"outputBaseDir": "src",
	"generators": {
		"component": {
			"templateSubDir": "component",
			"outputSubDir": "components/{{INSTANCE_NAME}}",
			"templates": {
				"component.js.liquid": "{{INSTANCE_NAME}}.component.js",
				"index.js.liquid": "index.js",
				"styles.js.liquid": "{{INSTANCE_NAME}}.styles.js"
			}
		},
		"view": {
			"templateSubDir": "view",
			"outputSubDir": "views/{{INSTANCE_NAME}}",
			"templates": {
				"view.js.liquid": "{{INSTANCE_NAME}}.view.js",
				"index.js.liquid": "index.js",
				"styles.js.liquid": "{{INSTANCE_NAME}}.styles.js"
			}
		}
	}
}

```

