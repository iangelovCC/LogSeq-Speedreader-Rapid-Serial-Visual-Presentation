/* eslint-disable no-console */
const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  platform: 'browser',
  format: 'iife',
  target: ['chrome114'],
  sourcemap: true,
  minify: false,
  define: {
    'process.env.NODE_ENV': '"production"'
  }
};

if (isWatch) {
  esbuild.context(buildOptions).then((ctx) => {
    return ctx.watch();
  }).then(() => {
    console.log('Watching...');
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  esbuild.build(buildOptions).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
