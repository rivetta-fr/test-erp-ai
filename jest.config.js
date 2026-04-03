module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'server.js',
    '!node_modules/**',
    '!**/node_modules/**'
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 10000,
  verbose: true
};
