import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src/__tests__'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^lucide-react$': '<rootDir>/../../node_modules/lucide-react/dist/cjs/lucide-react.js',
  },
  clearMocks: true,
};

export default config;
