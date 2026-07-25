const unitConfig = require('../jest.config');

module.exports = {
  ...unitConfig,
  displayName: 'erify_api integration',
  rootDir: '..',
  testRegex: '/test/integration/.*\\.integration-spec\\.ts$',
  setupFiles: ['<rootDir>/test/integration/setup-env.js'],
  maxWorkers: 1,
};
