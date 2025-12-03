/**
 * Babel configuration for transforming ES modules to CommonJS
 * Used by Jest to transform compiled ES module .js files from workspace packages
 */
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: 'commonjs', // Transform ES modules to CommonJS for Jest
      },
    ],
  ],
};

