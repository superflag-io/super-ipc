const esbuild = require('esbuild');

// Automatically exclude all node_modules from the bundled version
// const { nodeExternalsPlugin } = require('esbuild-node-externals');

const modules = {
  common: { folderName: 'common', isFrontend: false },
  backend: { folderName: 'backend', isFrontend: false },
  react: { folderName: 'react', isFrontend: true },
  preloader: { folderName: 'preloader', isFrontend: true },
};

const doBuild = (moduleName, useEsModules) => {
  esbuild
    .build({
      entryPoints: [`./${modules[moduleName].folderName}/index.ts`],
      outfile: `build/${moduleName}/index.${
        useEsModules === undefined ? '' : useEsModules ? 'm' : 'c'
      }js`,
      bundle: true,
      minify: false,
      sourcemap: true,
      format: useEsModules ? 'esm' : 'cjs',
      ...(modules[moduleName].isFrontend
        ? {
            external: ['react', 'react-dom'],
          }
        : {
            external: ['electron'],
            platform: 'node',
            target: 'node14',
          }),
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
