import Generator from '../lib/generator';
import fs from 'fs-extra';
import path from 'path';
import { Template } from 'liquid-node';

const coreConfig = JSON.parse(
    fs.readFileSync('./byobconfig.json')
);

describe('class Generator', () => {
    let g = null;

    beforeEach(() => {
        g = new Generator('view', coreConfig.generators.view, coreConfig);
    });

    afterEach(() => {
        g = null;
    });

    describe('constructor()', () => {
        it('creates an instance', () => {
            expect(g).not.toBeNull();
            expect(g.type).toBeDefined();
            expect(g.config).toBeDefined();
            expect(g.coreConfig).toBeDefined();
            expect(g.templates).toBeDefined();
            expect(g.engine).toBeDefined();
        });            
    });

    describe('templatesDir()', () => {
        it('returns templates/view', () => {
            expect(g.templatesDir).toBe(
                path.join(
                    process.cwd(),
                    'templates',
                    'view'
                )
            );
        });
    });

    describe('templateFilenames', () => {
        it('returns this generator\'s template filenames', () => {
            expect(g.templateFilenames).toEqual(
                expect.arrayContaining([
                    'view.js.liquid',
                    'index.js.liquid',
                    'styles.js.liquid'
                ])
            );
        });
    });

    describe('loadTemplateOnce()', () => {
        it('resolves to a template object', () => {
            expect.assertions(1);

            return g.loadTemplateOnce('view.js.liquid').then((template) => {
                return expect(template).toEqual(
                    expect.objectContaining({
                        contents: expect.any(Template),
                        outputSubdir: expect.any(Template),
                        outputFilename: expect.any(Template)
                    })
                );
            });    
        });
    });

    describe('outputDir', () => {
        it('returns the correct output directory for the generator', () => {
            expect(g.outputDir('views')).toBe(
                path.join(
                    process.cwd(),
                    'src',
                    'views'
                )
            )
        });
    });
    
});

