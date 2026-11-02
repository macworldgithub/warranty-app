// These GPS calculations are device-independent and need no native RN setup.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/roadTestGps.test.ts'],
  transform: { '^.+\\.tsx?$': 'babel-jest' },
};
