/**
 * Jest Configuration
 * 
 * Best Practices:
 * 1. Import packages through their package.json exports (not source files)
 * 2. Packages export compiled code from dist/ - Jest consumes compiled code
 * 3. Works in: local dev, CI, and turbo prune (packages are in node_modules)
 * 
 * Strategy:
 * - Use ts-jest for TypeScript files (.ts) - our source code
 * - Use babel-jest for compiled ES module .js files from @eridu/auth-sdk
 * - Let Jest resolve packages through package.json exports (no moduleNameMapper)
 * 
 * This follows monorepo best practices:
 * - No relative paths crossing app/package boundaries
 * - Packages export compiled code, not source files
 * - Jest transforms compiled ES modules to CommonJS using babel-jest
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    // Transform TypeScript files with ts-jest
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
    // Transform compiled ES module .js files from @eridu/auth-sdk with babel-jest
    // This handles the case where workspace packages export ES modules
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    // Ignore all node_modules except workspace packages (@eridu/*) and Jest/Babel packages
    // pnpm workspace packages are symlinked directly, not in .pnpm directory
    '<rootDir>/node_modules/(?!@eridu)',
  ],
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    // No mapping for @eridu/auth-sdk - let it resolve through package.json exports
    // This follows best practices: packages export compiled code, not source files
  },
};
