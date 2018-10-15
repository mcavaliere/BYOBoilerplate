import Generator from '../src/lib/generator';
import GeneratorManifest from '../src/lib/generatorManifest';
import fs from 'fs-extra';

const coreConfig = JSON.parse(
    fs.readFileSync('./byobconfig.json')
);

describe('class GeneratorManifest', () => {
    let m;
    let g;

    beforeEach(() => {
        m = new GeneratorManifest( coreConfig );
        g = m.generators; 
    });
    
    afterEach(() => {
        m = null;
        g = null;
    });

    describe('constructor', () => {
        it('creates an instance', () => {
            expect(m).toBeDefined();
            expect(m._generators).toBeDefined();
        });
    });
    
    describe('.generators', () => {
        it('should return key-value pairs', () => {
            expect(Object.keys(g).length).toBe(2);

            expect(Object.keys(g)).toEqual(
                expect.arrayContaining([
                    'component',
                    'view'
                ])
            );

            expect(g).toEqual(
                expect.objectContaining({
                    'component': expect.any(Generator),
                    'view': expect.any(Generator)
                })
            );           
        });
    });

    describe('.generatorNames', () => {
        it('should return the registered generators', () => {
            expect(m.generatorNames).toEqual(
                expect.arrayContaining([
                    'component',
                    'view'
                ])
            );
        });
    });

    describe('.generatorIsRegistered()', () => {
        it('should return true for a registered generator', () => {
            expect(m.generatorIsRegistered('view')).toBe(true);
        });

        it('should return false for a non-registered generator', () => {
            expect(m.generatorIsRegistered('nope')).toBe(false);
        });
    });

    describe('.getGenerator()', () => {
        it('should return a generator instance', () => {
            expect(m.getGenerator('view')).toBeInstanceOf(Generator);
        });        
    });



    
});