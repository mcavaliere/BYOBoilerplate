const presets = [
    [
        '@babel/env',
        {
            targets: {
                node: true
            },
            useBuiltIns: 'usage',
        },
    ],
];

const plugins = [
    '@babel/plugin-transform-template-literals',
    '@babel/plugin-transform-spread'
];

module.exports = { presets, plugins };
