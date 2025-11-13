import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Créer un utilisateur et se connecter
    await page.goto('/');
    await page.click('text=/S\'inscrire/i');
    const email = `test-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/chat/);
  });

  test('should send and receive message', async ({ page }) => {
    // Trouver l'input de chat
    const chatInput = page.locator('textarea[placeholder*="message"]');
    await expect(chatInput).toBeVisible();

    // Envoyer un message
    await chatInput.fill('Bonjour, comment ça va ?');
    await chatInput.press('Enter');

    // Vérifier que le message de l'utilisateur apparaît
    await expect(page.locator('text=/Bonjour, comment ça va ?/i')).toBeVisible();

    // Vérifier qu'une réponse de l'assistant apparaît (attendre max 10s)
    await expect(page.locator('[data-role="assistant"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should create new conversation', async ({ page }) => {
    // Cliquer sur "Nouveau Chat"
    await page.click('text=/Nouveau Chat/i');

    // Vérifier qu'une nouvelle conversation est créée
    await expect(page.locator('text=/Nouvelle Conversation/i')).toBeVisible();

    // L'input devrait être vide
    const chatInput = page.locator('textarea[placeholder*="message"]');
    await expect(chatInput).toHaveValue('');
  });

  test('should display conversation history', async ({ page }) => {
    // Envoyer un message
    const chatInput = page.locator('textarea[placeholder*="message"]');
    await chatInput.fill('Premier message');
    await chatInput.press('Enter');

    // Attendre la réponse
    await page.waitForTimeout(2000);

    // Créer une nouvelle conversation
    await page.click('text=/Nouveau Chat/i');

    // Envoyer un autre message
    await chatInput.fill('Deuxième message');
    await chatInput.press('Enter');

    // Vérifier que les 2 conversations apparaissent dans la sidebar
    const conversations = page.locator('[data-testid="conversation-item"]');
    await expect(conversations).toHaveCount(2);
  });

  test('should search conversations', async ({ page }) => {
    // Créer plusieurs conversations avec des titres différents
    await page.click('text=/Nouveau Chat/i');
    const chatInput = page.locator('textarea[placeholder*="message"]');

    await chatInput.fill('Question sur React');
    await chatInput.press('Enter');
    await page.waitForTimeout(1000);

    await page.click('text=/Nouveau Chat/i');
    await chatInput.fill('Question sur TypeScript');
    await chatInput.press('Enter');
    await page.waitForTimeout(1000);

    // Utiliser la recherche
    const searchInput = page.locator('input[placeholder*="Rechercher"]');
    await searchInput.fill('React');

    // Vérifier que seule la conversation React est visible
    await expect(page.locator('text=/React/i')).toBeVisible();
    await expect(page.locator('text=/TypeScript/i')).not.toBeVisible();
  });

  test('should delete conversation', async ({ page }) => {
    // Envoyer un message pour créer une conversation
    const chatInput = page.locator('textarea[placeholder*="message"]');
    await chatInput.fill('Message à supprimer');
    await chatInput.press('Enter');
    await page.waitForTimeout(1000);

    // Hover sur la conversation et cliquer sur supprimer
    await page.hover('[data-testid="conversation-item"]');
    await page.click('[title="Supprimer"]');

    // Confirmer la suppression si modal
    const confirmButton = page.locator('text=/Confirmer|Supprimer/i');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Vérifier que la conversation est supprimée
    await expect(page.locator('text=/Message à supprimer/i')).not.toBeVisible();
  });

  test('should copy message to clipboard', async ({ page, context }) => {
    // Accorder les permissions clipboard
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Envoyer un message
    const chatInput = page.locator('textarea[placeholder*="message"]');
    await chatInput.fill('Message à copier');
    await chatInput.press('Enter');

    // Attendre la réponse
    await page.waitForTimeout(2000);

    // Hover sur le message de l'assistant et cliquer sur copier
    await page.hover('[data-role="assistant"]');
    await page.click('[title="Copier le message"]');

    // Vérifier que l'icône change (Check)
    await expect(page.locator('[data-icon="check"]')).toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    // Cliquer sur le toggle theme
    await page.click('[data-testid="theme-toggle"]');

    // Vérifier que le dark mode est activé (classe dark sur html)
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Re-cliquer pour revenir en light mode
    await page.click('[data-testid="theme-toggle"]');
    await expect(html).not.toHaveClass(/dark/);
  });
});
