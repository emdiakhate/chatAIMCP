import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/ChatAI/i);
    await expect(page.locator('h1')).toContainText(/ChatAI Pro/i);
  });

  test('should show error on invalid credentials', async ({ page }) => {
    // Remplir le formulaire avec des credentials invalides
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Soumettre
    await page.click('button[type="submit"]');

    // Vérifier le message d'erreur
    await expect(page.locator('text=/Invalid credentials/i')).toBeVisible();
  });

  test('should register new user', async ({ page }) => {
    // Naviguer vers inscription
    await page.click('text=/S\'inscrire/i');

    // Remplir le formulaire
    const email = `test-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Soumettre
    await page.click('button[type="submit"]');

    // Vérifier la redirection vers le chat
    await expect(page).toHaveURL(/\/chat/);
  });

  test('should login existing user', async ({ page }) => {
    // Créer d'abord un utilisateur
    await page.click('text=/S\'inscrire/i');
    const email = `test-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Se déconnecter
    await page.click('text=/Déconnexion/i');

    // Se reconnecter
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Vérifier la connexion réussie
    await expect(page).toHaveURL(/\/chat/);
  });

  test('should persist session after refresh', async ({ page, context }) => {
    // Créer et se connecter
    await page.click('text=/S\'inscrire/i');
    const email = `test-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Attendre la redirection
    await page.waitForURL(/\/chat/);

    // Recharger la page
    await page.reload();

    // Vérifier que l'utilisateur est toujours connecté
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.locator('text=/Nouvelle Conversation/i')).toBeVisible();
  });
});
