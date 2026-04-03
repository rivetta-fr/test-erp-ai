import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour tests E2E
 * Tests d'interface utilisateur et workflows complets
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Serveur web à tester
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Timeout global
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },

  // Configuration des tests
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporting
  reporter: 'html',

  use: {
    // URL de base
    baseURL: 'http://localhost:3001',
    
    // Capture
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    // Navigation
    navigationTimeout: 30000,
  },

  // Projets de test
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Tests mobiles optionnels
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
