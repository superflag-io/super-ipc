const esbuild = require('esbuild');

// Automatically exclude all node_modules from the bundled version
// const { nodeExternalsPlugin } = require('esbuild-node-externals');

const modules = {
  common: 'common',
};

const doBuild = (moduleName, useEsModules) => {
  esbuild
    .build({
      entryPoints: [`./${modules[moduleName]}/index.ts`],
      outfile: `build/${moduleName}/index.${
        useEsModules === undefined ? '' : useEsModules ? 'm' : 'c'
      }js`,
      bundle: true,
      minify: false,
      platform: 'node',
      sourcemap: true,
      target: 'node14',
      ...(useEsModules === undefined
        ? {}
        : { format: useEsModules ? 'esm' : 'cjs' }),
      // plugins: [nodeExternalsPlugin()],
      plugins: [],
    })
    .catch(() => process.exit(1));
};

Object.keys(modules).forEach((name) => {
  doBuild(name);
  doBuild(name, true);
  doBuild(name, false);
});
