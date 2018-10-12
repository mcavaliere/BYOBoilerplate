import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
const babelConfig = require( './babel.config' );
const resolveConfig = {
    
};

export default {
    banner: '#!/usr/bin/env node',
    input: 'src/cli.js',
    output: {
        file: 'dist/cli.js',
        format: 'cjs'
    },
    external: [ 
        'assert',
        'constants',
        'fs', 
        'mkdirp' ,
        'path',
        'stream',
        'util'
    ],
    plugins: [
        resolve(),
        commonjs(
            {
            //     namedExports: {
            //         // left-hand side can be an absolute path, a path
            //         // relative to the current directory, or the name
            //         // of a module in node_modules
            //         // 'node_modules/node-mkdirp/index.js': [ 'mkdirp' ]
            //     }
            }
        ),
        // babel(babelConfig)
    ]
};