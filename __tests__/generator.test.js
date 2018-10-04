import Generator from '../lib/generator';
import fs from 'fs';
import glob from 'glob';
import mock from 'mock-fs';
import path from 'path';
import { Template } from 'liquid-node';

describe('class Generator', () => {
    let g = null;
    let realFiles = {};
    let coreConfig;

    beforeAll(() => {
        // Create in-memory versions of existing files, since we'll 
        //   be working with a temporary in-memory filesystem.
        coreConfig = JSON.parse(
            fs.readFileSync('./byobconfig.json')
        );
        let fileNames = glob.sync('./templates/**/*.liquid');
        fileNames.forEach((item) => {
            realFiles[item] = fs.readFileSync(item);
        });
    });

    beforeEach(() => {
        mock(realFiles);

        g = new Generator('view', coreConfig.generators.view, coreConfig);
    });

    afterEach(() => {
        g = null;
        mock.restore();
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
            );
        });
    });

    describe('writeTemplate', () => {
        it('should write the correct files', () => {
            expect.assertions(1);

            return g.writeTemplate('bar.txt', 'foo', 'File contents here.')
                .then(() => {
                    return expect( fs.existsSync('src/foo/bar.txt') ).toEqual(true);
                });
        });
    });    
});

