import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * EXPLICACIÓN TUTORIAL:
 * Pruebas de estrés y carga para la sincronización offline-online de la PWA.
 * Se utiliza un correo único con timestamp por cada prueba para evitar que
 * tareas de ejecuciones previas interfieran en los conteos de la UI.
 */

// Helper para iniciar sesión con aislamiento
async function loginWithEmail(page: Page, context: BrowserContext, email: string) {
  await context.clearCookies();
  await page.goto('/auth/signin');
  
  await page.evaluate(async () => {
    const databases = await window.indexedDB.databases();
    for (const db of databases) {
      if (db.name) window.indexedDB.deleteDatabase(db.name);
    }
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL('/', { timeout: 8000 });
  } catch (e) {
    console.log(`Usuario ${email} no encontrado en CI, registrando...`);
    await page.goto('/auth/signup');
    await page.fill('input[placeholder="Tu nombre"]', 'LoadTester');
    await page.fill('input[placeholder="tu@email.com"]', email);
    await page.fill('input[placeholder="••••••••"]', '123456');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/auth/signin?registered=true');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 15000 });
  }
}

test.describe('PWA Load and Stress Sincronización', () => {

  test('debe permitir crear 50 tareas offline de forma masiva y sincronizarlas en cola', async ({ page, context }) => {
    const email = `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}@example.com`;
    await loginWithEmail(page, context, email);

    // 1. Ir a modo offline
    await context.setOffline(true);

    const taskTitles: string[] = [];
    const totalTasks = 50;

    console.log(`Creando ${totalTasks} tareas offline...`);
    for (let i = 1; i <= totalTasks; i++) {
      const title = `Estrés Tarea #${i} - ${Date.now()}`;
      taskTitles.push(title);
      
      await page.fill('input[placeholder="¿Qué hay que hacer?"]', title);
      await page.press('input[placeholder="¿Qué hay que hacer?"]', 'Enter');
      await expect(page.locator(`text=${title}`)).toBeVisible();
    }

    const localBadges = page.getByTitle(/guardado localmente|pendiente/i);
    await expect(localBadges).toHaveCount(totalTasks);

    console.log('Pasando a modo online...');

    // 2. Pasar a modo online
    await context.setOffline(false);

    // 3. Esperar que se sincronice el lote completo
    console.log('Esperando la sincronización en lote...');
    const synchronizedBadges = page.getByTitle(/sincronizado con mongodb/i);
    await expect(synchronizedBadges).toHaveCount(totalTasks, { timeout: 45000 });

    // 4. Confirmar persistencia recargando
    await page.reload();
    await page.waitForSelector('input[placeholder="¿Qué hay que hacer?"]');

    for (const title of taskTitles) {
      await expect(page.locator(`text=${title}`)).toBeVisible();
    }
    await expect(synchronizedBadges).toHaveCount(totalTasks);
    console.log('Persistencia masiva validada con éxito.');
  });

  test('debe gestionar la intermitencia de red (Lie-Fi) sin duplicar tareas y continuar al restablecerse', async ({ page, context }) => {
    const email = `liefi-${Date.now()}-${Math.random().toString(36).substring(2, 5)}@example.com`;
    await loginWithEmail(page, context, email);

    // 1. Ir a modo offline
    await context.setOffline(true);

    const taskTitles: string[] = [];
    const totalTasks = 20;

    console.log('Creando 20 tareas offline...');
    for (let i = 1; i <= totalTasks; i++) {
      const title = `Intermitencia #${i} - ${Date.now()}`;
      taskTitles.push(title);
      await page.fill('input[placeholder="¿Qué hay que hacer?"]', title);
      await page.press('input[placeholder="¿Qué hay que hacer?"]', 'Enter');
      await expect(page.locator(`text=${title}`)).toBeVisible();
    }

    const localBadges = page.getByTitle(/guardado localmente|pendiente/i);
    await expect(localBadges).toHaveCount(totalTasks);

    // 2. Pasar a modo online para iniciar la sincronización
    await context.setOffline(false);

    // 3. Cortar la red tras una pausa muy corta (ej. 400ms)
    await page.waitForTimeout(400);
    console.log('¡Corte de red a mitad de camino! Pasando a offline...');
    await context.setOffline(true);

    await page.waitForTimeout(2000);

    const syncCount = await page.getByTitle(/sincronizado con mongodb/i).count();
    const unsyncCount = await page.getByTitle(/guardado localmente|pendiente/i).count();
    console.log(`Estado tras corte: Sincronizadas: ${syncCount}, Pendientes locales: ${unsyncCount}`);

    expect(syncCount + unsyncCount).toBe(totalTasks);

    // 4. Volver a online de forma definitiva
    console.log('Restableciendo conexión final...');
    await context.setOffline(false);

    const synchronizedBadges = page.getByTitle(/sincronizado con mongodb/i);
    await expect(synchronizedBadges).toHaveCount(totalTasks, { timeout: 25000 });

    // 5. Verificar que no haya duplicados
    await page.reload();

    for (const title of taskTitles) {
      await expect(page.locator(`text=${title}`)).toHaveCount(1);
    }
    console.log('Sincronización resiliente sin duplicados validada.');
  });

});
