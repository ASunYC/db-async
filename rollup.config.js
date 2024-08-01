import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

const sharedConfig = {
    input: './src/index.ts',
    plugins: [
        peerDepsExternal(),
        resolve({
            extensions: ['.js', '.ts']
        }),
        commonjs(),
        json(),
        typescript({
            tsconfigOverride: {
                compilerOptions: {
                    declaration: true,
                    declarationMap: false,
                    module: "esnext"
                }
            }
        })
    ],
    external: ['sqlite3']  // Add sqlite3 as an external dependency
};

export default [
    {
        ...sharedConfig,
        output: [{
            format: 'cjs',
            file: './dist/index.js',
            banner: require('./scripts/copyright')
        }]
    },
    {
        ...sharedConfig,
        output: [{
            format: 'es',
            file: './dist/index.mjs',
            banner: require('./scripts/copyright')
        }]
    }
];