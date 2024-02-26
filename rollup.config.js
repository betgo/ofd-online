import { defineConfig } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import sourcemaps from 'rollup-plugin-sourcemaps';

import pkg from './package.json';

const isDev = process.env.NODE_ENV !== 'production';

const extensions = ['.ts', '.js'];
const noDeclarationFiles = { compilerOptions: { declaration: false } };

const babelRuntimeVersion = pkg.devDependencies['@babel/runtime'].replace(
  /^[^0-9]*/,
  ''
);

const external = [
  ...Object.keys(pkg.dependencies || {}),
  // @ts-ignore
  ...Object.keys(pkg.peerDependencies || {})
].map(name => RegExp(`^${name}($|/)`));

export default defineConfig([
  // CommonJS
  {
    input: 'src/index.ts',
    output: { file: 'lib/preview.js', format: 'cjs', indent: false },
    external,
    plugins: [
      nodeResolve({
        extensions
      }),
      typescript({
        tsconfig: './tsconfig.json',
        tsconfigOverride: {},
        useTsconfigDeclarationDir: true
      }),
      babel({
        extensions,
        plugins: [
          ['@babel/plugin-transform-runtime', { version: babelRuntimeVersion }]
          // ['./scripts/mangleErrors.js', { minify: false }]
        ],
        babelHelpers: 'runtime'
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true
          // drop_console: true
        }
      })
    ]
  },

  // ES
  {
    input: 'src/es.ts',
    output: { file: 'es/index.js', format: 'es', indent: false },
    external,
    plugins: [
      nodeResolve({
        extensions
      }),
      typescript({ tsconfigOverride: noDeclarationFiles })
      // commonjs(),
      // babel({
      //   extensions,
      //   plugins: [
      //     [
      //       '@babel/plugin-transform-runtime',
      //       { version: babelRuntimeVersion, useESModules: true }
      //     ]
      //     // ['./scripts/mangleErrors.js', { minify: false }]
      //   ],
      //   babelHelpers: 'runtime'
      // })
      // terser({
      //   compress: {
      //     pure_getters: true,
      //     unsafe: true,
      //     unsafe_comps: true
      //     // drop_console: true
      //   }
      // })
    ]
  },

  // ES for Browsers
  {
    input: 'src/index.ts',
    output: { file: 'es/preview.mjs', format: 'es', indent: false },
    plugins: [
      nodeResolve({
        extensions
      }),
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      typescript({ tsconfigOverride: noDeclarationFiles }),
      commonjs(),
      babel({
        extensions,
        exclude: ['node_modules/**'],
        // plugins: [['./scripts/mangleErrors.js', { minify: true }]],
        skipPreflightCheck: true,
        babelHelpers: 'bundled'
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true
          // drop_console: true
        }
      })
    ]
  },

  // UMD Production
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/preview.min.js',
      format: 'umd',
      name: 'OFD_PREVIEW',
      indent: false,
      sourcemap: isDev
    },
    plugins: [
      nodeResolve({
        extensions
      }),
      isDev &&
        serve({
          contentBase: '', //服务器启动的文件夹，默认是项目根目录，需要在该文件下创建index.html
          port: 8020 //端口号，默认10001
        }),
      isDev && livereload('dist'),
      // typescript(),
      typescript({ tsconfigOverride: noDeclarationFiles }),
      isDev && sourcemaps(),
      commonjs(),
      babel({
        extensions,
        exclude: ['node_modules/**'],
        // plugins: [['./scripts/mangleErrors.js', { minify: true }]],
        skipPreflightCheck: true,
        babelHelpers: 'bundled'
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true
        }
      })
    ]
  }
]);
