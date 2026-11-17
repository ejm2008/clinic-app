import { expect, Page, test } from '@playwright/test';

function formatLocalDateTimeInput(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await expect(page).not.toHaveURL(/\/login$/);
}

async function logout(page: Page) {
  await page.click('button:has-text("Sair")');
  await expect(page).toHaveURL(/\/login/);
}

test.describe('Clínica Médica — Fluxos E2E', () => {
  test('tentativa de fazer dois agendamentos no mesmo horário aceita apenas o primeiro', async ({
    page,
  }) => {
    await loginAs(page, 'equipe@clinica.com', 'staff123');
    await expect(page).toHaveURL(/\/staff\/schedule/);

    const uniqueHoursAhead = 240 + Math.floor(Math.random() * 4000);
    const slot = new Date(Date.now() + uniqueHoursAhead * 60 * 60 * 1000);
    slot.setSeconds(0, 0);
    const slotInput = formatLocalDateTimeInput(slot);

    await page.selectOption('#new-patient', { index: 1 });
    await page.selectOption('#new-exam', 'RAIO_X');
    await page.fill('#new-datetime', slotInput);

    const firstResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/appointments') && res.request().method() === 'POST',
    );
    await page.click('button:has-text("Criar Agendamento")');
    const firstResponse = await firstResponsePromise;
    expect(firstResponse.status()).toBe(201);

    await page.selectOption('#new-patient', { index: 1 });
    await page.selectOption('#new-exam', 'ULTRASSOM');
    await page.fill('#new-datetime', slotInput);

    const secondResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/appointments') && res.request().method() === 'POST',
    );
    await page.click('button:has-text("Criar Agendamento")');
    const secondResponse = await secondResponsePromise;
    expect(secondResponse.status()).toBe(409);

    await expect(page.getByText(/Horário indisponível/i)).toBeVisible();
  });

  test('um paciente tenta acessar o laudo de outro paciente sem sucesso', async ({ page }) => {
    await loginAs(page, 'joao@paciente.com', 'paciente123');
    await page.click('a:has-text("Meus Laudos")');
    await expect(page).toHaveURL(/\/patient\/reports/);

    await page.click('text=Laudo de Radiografia de Tórax');
    await expect(page).toHaveURL(/\/patient\/reports\/.+/);
    const joaoReportUrl = new URL(page.url()).pathname;

    await logout(page);

    await loginAs(page, 'maria@paciente.com', 'paciente123');
    await page.click('a:has-text("Meus Laudos")');
    await expect(page.getByText('Laudo de Radiografia de Tórax')).toHaveCount(0);

    await page.goto(joaoReportUrl);
    await expect(page.getByText('Laudo não encontrado ou indisponível.')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('um paciente tenta acessar um laudo em rascunho sem sucesso', async ({ page }) => {
    await loginAs(page, 'equipe@clinica.com', 'staff123');
    await page.click('a:has-text("Laudos")');
    await expect(page).toHaveURL(/\/staff\/reports/);

    await page
      .locator('tr', { hasText: 'Rascunho — Ultrassonografia Abdominal' })
      .getByRole('link', { name: 'Editar' })
      .click();
    await expect(page).toHaveURL(/\/staff\/reports\/.+/);
    const reportId = page.url().split('/').pop()!;

    await logout(page);

    await loginAs(page, 'maria@paciente.com', 'paciente123');
    await page.click('a:has-text("Meus Laudos")');
    await expect(page.getByText('Rascunho — Ultrassonografia Abdominal')).toHaveCount(0);

    await page.goto(`/patient/reports/${reportId}`);
    await expect(page.getByText('Laudo não encontrado ou indisponível.')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('um laudo publicado fica disponível apenas para o paciente especificado', async ({
    page,
  }) => {
    const uniqueTag = Date.now();
    const reportTitle = `Laudo Específico ${uniqueTag}`;
    const reportContent = `Resultado exclusivo para João (${uniqueTag}).`;

    await loginAs(page, 'equipe@clinica.com', 'staff123');
    await expect(page).toHaveURL(/\/staff\/schedule/);

    const uniqueHoursAhead = 4500 + Math.floor(Math.random() * 4000);
    const slot = new Date(Date.now() + uniqueHoursAhead * 60 * 60 * 1000);
    slot.setSeconds(0, 0);

    const joaoOptionValue = await page
      .locator('#new-patient option', { hasText: 'João Carlos Silva' })
      .getAttribute('value');
    expect(joaoOptionValue).toBeTruthy();

    await page.selectOption('#new-patient', joaoOptionValue!);
    await page.selectOption('#new-exam', 'RESSONANCIA_MAGNETICA');
    await page.fill('#new-datetime', formatLocalDateTimeInput(slot));

    const createApptPromise = page.waitForResponse(
      (res) => res.url().includes('/api/appointments') && res.request().method() === 'POST',
    );
    await page.click('button:has-text("Criar Agendamento")');
    const createApptRes = await createApptPromise;
    expect(createApptRes.status()).toBe(201);
    const { appointment } = (await createApptRes.json()) as { appointment: { id: string } };

    await page.goto(`/staff/reports/new/${appointment.id}`);
    await page.fill('#report-title', reportTitle);
    await page.fill('#report-responsible', 'Dra. Ana Paula Souza');
    await page.fill('#report-content', reportContent);

    const createReportPromise = page.waitForResponse(
      (res) => res.url().includes('/api/reports') && res.request().method() === 'POST',
    );
    await page.click('button:has-text("Publicar Laudo")');
    const createReportRes = await createReportPromise;
    expect(createReportRes.status()).toBe(201);
    const { report } = (await createReportRes.json()) as { report: { id: string } };

    await logout(page);

    await loginAs(page, 'joao@paciente.com', 'paciente123');
    await page.click('a:has-text("Meus Laudos")');
    await expect(page.getByText(reportTitle)).toBeVisible();
    await page.click(`text=${reportTitle}`);
    await expect(page.getByText(reportContent)).toBeVisible();

    await logout(page);

    await loginAs(page, 'maria@paciente.com', 'paciente123');
    await page.click('a:has-text("Meus Laudos")');
    await expect(page.getByText(reportTitle)).toHaveCount(0);

    await page.goto(`/patient/reports/${report.id}`);
    await expect(page.getByText('Laudo não encontrado ou indisponível.')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('tentar agendar em uma data anterior à de hoje sem sucesso', async ({ page }) => {
    await loginAs(page, 'equipe@clinica.com', 'staff123');
    await expect(page).toHaveURL(/\/staff\/schedule/);

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    yesterday.setSeconds(0, 0);

    await page.selectOption('#new-patient', { index: 1 });
    await page.selectOption('#new-exam', 'RAIO_X');
    await page.fill('#new-datetime', formatLocalDateTimeInput(yesterday));

    const isRangeUnderflow = await page
      .locator('#new-datetime')
      .evaluate((el: HTMLInputElement) => el.validity.rangeUnderflow);
    expect(isRangeUnderflow).toBe(true);

    // Garante que mesmo enviando ao servidor, o agendamento no passado é rejeitado (400)
    await page.locator('#new-datetime').evaluate((el: HTMLInputElement) => {
      el.removeAttribute('min');
    });

    const pastResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/appointments') && res.request().method() === 'POST',
    );
    await page.click('button:has-text("Criar Agendamento")');
    const pastResponse = await pastResponsePromise;
    expect(pastResponse.status()).toBe(400);

    await expect(page.getByText(/anterior à data e horário atuais/i)).toBeVisible();
  });
});
