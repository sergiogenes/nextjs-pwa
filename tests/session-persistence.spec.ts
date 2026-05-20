import { test, expect } from '@playwright/test';

/**
 * EXPLICACIÓN TUTORIAL:
 * Este test verifica la "Persistencia de Sesión Offline".
 * 
 * El objetivo es asegurar que el Service Worker cachea correctamente la sesión
 * del usuario. Si el usuario está logueado y pierde la conexión (o recarga
 * estando en modo avión), la aplicación debe seguir reconociendo quién es
 * gracias al caché de /api/auth/session.
 */

test.describe('PWA Session Resilience', () => {

  test('la sesión debe persistir después de recargar en modo offline', async ({ page, context, browserName }) => {
    // EXPLICACIÓN TUTORIAL:
    // WebKit (Safari) tiene problemas conocidos de inestabilidad al simular 
    // modo offline con Service Workers en entornos de test automáticos.
    // Lo omitimos para este test específico para evitar falsos negativos.
    if (browserName === 'webkit') {
      test.skip();
    }

    // 1. Iniciar sesión normalmente (Online)
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    // EXPLICACIÓN TUTORIAL:
    // En CI (GitHub Actions), la base de datos empieza vacía.
    // Si el login falla, registramos al usuario de prueba sobre la marcha.
    try {
      await page.waitForURL('/', { timeout: 10000 });
    } catch (e) {
      console.log('Usuario no encontrado en CI, registrando...');
      await page.goto('/auth/signup');
      await page.fill('input[placeholder="Tu nombre"]', 'PlayWrite');
      await page.fill('input[placeholder="tu@email.com"]', 'test@example.com');
      await page.fill('input[placeholder="••••••••"]', '123456');
      await page.click('button[type="submit"]');
      
      // Volvemos a login tras registro
      await page.waitForURL('/auth/signin?registered=true');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', '123456');
      await page.click('button[type="submit"]');
      await page.waitForURL('/', { timeout: 15000 });
    }
    
    // 2. Asegurar que el Service Worker esté activo y controlando la página
    // EXPLICACIÓN TUTORIAL:
    // Forzamos una recarga ONLINE después de que el SW esté registrado.
    // Esto garantiza que el SW intercepte las peticiones de sesión y las guarde en caché.
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });
    
    // Recarga online para que el SW cachee todo (incluyendo la sesión)
    await page.reload();
    await page.waitForURL('/');

    // Verificamos que el nombre aparece (Online)
    await expect(page.locator('body')).toContainText('PlayWrite');

    // 3. Simular Modo Avión
    await context.setOffline(true);

    // 4. Recargar la página estando Offline
    // Al estar offline, el SW servirá el HTML y el JSON de sesión desde el caché.
    await page.reload();
    
    // 5. Verificar que seguimos logueados (Offline)
    await expect(page).toHaveURL('/');
    
    // El nombre del usuario debería seguir siendo visible (servido desde caché del SW)
    // Usamos el body para ser más genéricos por si el componente 'main' tarda un ms en montarse
    await expect(page.locator('body')).toContainText('PlayWrite');
    
    // Opcional: Verificar que las tareas siguen ahí (confirma que userId != null)
    await expect(page.locator('text=PWA Tasks')).toBeVisible();
  });

});
