# BYOBoilerplate

**[ALPHA]** Simple, customizable code generators for any damn language you'd like. 

Inspired by the `rails generate` command. Written in NodeJS. Uses the Liquid templating language. 


<p align="center">
<img src="byoboilerplate.jpg" width="200" />
</p>
	


### What is it?

BYOBoilerplate lets you generate boilerplate code easily, however you like it. 

**`bgen component MyComponent`**
```
src
└── components
    └── MyComponent
        ├── MyComponent.component.js
        ├── MyComponent.styles.js
        └── index.js
```


### Why I created it

I'm a React / Redux programmer, and I find myself repeatedly copying and pasting folder structure to create a new component, view, set of reducers, and so on, then changing the finer details in each one. And I hate repeating myself. 

And I hate repeating myself. 

### Whom should use it

Use BYOBoilerplate: 

* ...if you hate copy-pasting files, and making small alterations.
* ...for code you can't, or don't want to put in a module.

### Usage Examples (React / ES6):

These are sample generators that come packaged with BYOBoilerplate. They're written for React / Redux, just because I use those things a lot. Write your own, for any language. But you can easily create your own generators. 


**`bgen component MyComponent`**
```
src
└── components
    └── MyComponent
        ├── MyComponent.component.js
        ├── MyComponent.styles.js
        └── index.js
```

**`bgen view MyView`**
```
src
└── views
    └── MyView
        ├── MyView.view.js
        ├── MyView.styles.js
        └── index.js

```

### Installation

With `npm`:

```
npm i --save-dev byoboilerplate
```

With `yarn`:

```
yarn add --dev byoboilerplate
```

Then run `bgen init` from your project's root folder to generate your default `byoboilerplate.json` and `templates` folder. 

### Creating custom templates

#### 1. Add your templates. 

Add your code templates (written in Liquid) to a folder of your choosing (`/templates` by default). 

#### 2. Edit `byobconfig.json`. 

Edit the packaged `byobconfig.json` to create or modify your generator settings. See the example `byobconfig.json` below. 

#### 3. Generate some code!

`npm run generate **generatorName** **instanceName**. `

#### 4. Have a beer 🍺

You just saved some time. 



### Configuration

The following settings are in `byobconfig.json` and can be edited as needed: 

| Property | Description |
| ------------- | ------------- |
| `templatesDir` | Base directory of your templates. Subfolders should be named after generators (e.g., "component", "view", "chicken", etc) |
| `outputBaseDir` | Base directory for generated output. |
| `generators` | Object. Keys are generator names (which you will pass to `bgen`; values are the settings for that generator. |
| `generators.templateSubDir` | The subdirectory of `templatesDir` containing this generator's template files. | 
| `generators.outputSubdir` | The subdirectory of `outputBaseDir` where this generator's output will go. Can contain Liquid markup, and can be a partial path (path/to/subdir). | 
| `generators.templates` | Object. Keys are source files inside `templateSubDir`; values are filenames to output inside `outputSubDir`, and contain Liquid markup. |

See the sample `byobconfig.json` (below, or created with `bgen init`) for examples of all the above. 

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

### Running the tests

There's some core test coverage currently. Run `npm test` or `yarn test` from the source folder. 