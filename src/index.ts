// The runtime module of the package: an empty object. The package is its types (index.d.ts); loading it does nothing.
// `npm run build` compiles this file to index.js, the `main` of the published package. Node.js does not run
// TypeScript from inside node_modules, so what is published is the compiled file.
module.exports = {};
