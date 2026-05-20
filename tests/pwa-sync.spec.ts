import { test, expect } from '@playwright/test';

/**
 * EXPLICACIÓN TUTORIAL:
 * Estos tests verifican el ciclo de vida completo (CRUD) de la PWA en modo Offline.
 * 
 * Escenarios testeados:
 * 1. Crear Tarea Offline -> Sincronizar.
 * 2. Editar Tarea Offline -> Sincronizar.
 * 3. Eliminar Tarea Offline -> Sincronizar.
 */

test.describe('PWA Offline Resilience (CRUD)', () => {

  // Login inicial para todos los tests del bloque
  test.beforeEach(async ({ page, context }) => {
    // 1. Limpieza total de estado para evitar sesiones residuales
    await context.clearCookies();
    
    await page.goto('/auth/signin');
    
    // 2. Limpieza de base de datos local
    await page.evaluate(async () => {
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      }
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    // 3. Login con lógica de auto-registro para CI
    // EXPLICACIÓN TUTORIAL:
    // En entornos de CI (GitHub Actions), la base de datos empieza vacía.
    // Si el login falla, registramos al usuario de prueba sobre la marcha.
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    try {
      // Intentamos esperar la redirección a la home
      await page.waitForURL('/', { timeout: 10000 });
    } catch (e) {
      // Si falla (probablemente usuario no existe), vamos a Signup
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
  });

  test('debe permitir crear una tarea offline y sincronizarla', async ({ page, context }) => {
    await context.setOffline(true);
    const taskTitle = `Nueva ${Date.now()}`;
    
    await page.fill('input[placeholder="¿Qué hay que hacer?"]', taskTitle);
    await page.press('input[placeholder="¿Qué hay que hacer?"]', 'Enter');

    await expect(page.locator(`text=${taskTitle}`)).toBeVisible();
    await expect(page.getByTitle('Pendiente').first()).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByTitle('Sincronizado').first()).toBeVisible({ timeout: 15000 });
  });

  test('debe permitir editar una tarea offline y sincronizar el cambio', async ({ page, context }) => {
    // 1. Crear una tarea online primero para tener algo que editar con ID real
    const taskTitle = `Para Editar ${Date.now()}`;
    await page.fill('input[placeholder="¿Qué hay que hacer?"]', taskTitle);
    await page.press('input[placeholder="¿Qué hay que hacer?"]', 'Enter');
    
    // Esperar a que se sincronice para que tenga ID de base de datos
    const taskRow = page.locator('div.bg-white', { hasText: taskTitle });
    await expect(taskRow.getByTitle('Sincronizado')).toBeVisible({ timeout: 10000 });

    // 2. IR OFFLINE
    await context.setOffline(true);

    // 3. Editar
    await taskRow.getByTitle('Editar tarea').click();
    const newTitle = `${taskTitle} - Editado`;
    
    // Esperamos al input de edición (es el segundo textbox que aparece)
    const editInput = page.getByRole('textbox').nth(1);
    await editInput.fill(''); // Limpiar
    await editInput.fill(newTitle);
    await page.locator('button.text-green-500').click(); // Botón Check

    // Verificar UI optimista
    await expect(page.locator(`text=${newTitle}`)).toBeVisible();
    await expect(taskRow.getByTitle('Pendiente')).toBeVisible();

    // 4. IR ONLINE
    await context.setOffline(false);
    await expect(taskRow.getByTitle('Sincronizado')).toBeVisible({ timeout: 15000 });
    await expect(page.locator(`text=${newTitle}`)).toBeVisible();
  });

  test('debe permitir eliminar una tarea offline y sincronizar el borrado', async ({ page, context }) => {
    // 1. Crear una tarea online
    const taskTitle = `Para Borrar ${Date.now()}`;
    await page.fill('input[placeholder="¿Qué hay que hacer?"]', taskTitle);
    await page.press('input[placeholder="¿Qué hay que hacer?"]', 'Enter');
    
    const taskRow = page.locator('div.bg-white', { hasText: taskTitle });
    await expect(taskRow.getByTitle('Sincronizado')).toBeVisible({ timeout: 10000 });

    // 2. IR OFFLINE
    await context.setOffline(true);

    // 3. Borrar
    await taskRow.getByTitle('Eliminar tarea').click();

    // Verificar UI optimista: La tarea debe desaparecer de la lista inmediatamente
    await expect(page.locator(`text=${taskTitle}`)).not.toBeVisible();

    // 4. IR ONLINE
    await context.setOffline(false);

    // 5. Verificar que sigue sin estar (confirmación del servidor)
    // Esperamos un poco para dar tiempo al orquestador
    await page.waitForTimeout(2000); 
    await expect(page.locator(`text=${taskTitle}`)).not.toBeVisible();
  });

});
