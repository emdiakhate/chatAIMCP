import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour tests E2E
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Timeout maximum par test */
  timeout: 30 * 1000,

  /* Configuration pour les tests en parallèle */
  fullyParallel: true,

  /* Échouer si des tests.only sont laissés */
  forbidOnly: !!process.env.CI,

  /* Retry en cas d'échec */
  retries: process.env.CI ? 2 : 0,

  /* Nombre de workers */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter */
  reporter: 'html',

  /* Configuration partagée pour tous les projets */
  use: {
    /* URL de base */
    baseURL: 'http://localhost:5173',

    /* Collecter les traces en cas d'échec */
    trace: 'on-first-retry',

    /* Screenshot en cas d'échec */
    screenshot: 'only-on-failure',

    /* Video en cas d'échec */
    video: 'retain-on-failure',
  },

  /* Configuration des projets de test */
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

    /* Tests mobiles */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Démarrer le serveur de dev avant les tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
