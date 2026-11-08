// Run only against a disposable demo database. This creates fictional test data.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3000';

async function request(path, { token, body, method = 'GET', key, expected = 200 } = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  assert.equal(response.status, expected, `${method} ${path}: ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function waitForReadiness() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/actuator/health/readiness`, {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok && (await response.json()).status === 'UP') return;
    } catch {
      // The proxy may be ready before the backend finishes its migrations.
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Demo did not become ready. Inspect docker compose logs.');
}

async function main() {
  await waitForReadiness();
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<div id="root"><\/div>/);

  const admin = await request('/auth/login', {
    method: 'POST', body: { login: 'admin@demo.local', password: 'DemoAdmin2026!' },
  });
  const teacher = await request('/auth/login', {
    method: 'POST', body: { login: 'teacher@demo.local', password: 'DemoTeacher2026!' },
  });
  assert.equal(admin.user.role, 'ADMIN');
  assert.equal(teacher.user.role, 'TEACHER');
  const token = admin.accessToken;
  const groups = await request('/teacher/groups', { token: teacher.accessToken });
  assert.ok(groups.length > 0, 'Demo teacher needs a group.');

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const month = today.slice(0, 7);
  const child = await request('/children', {
    token, method: 'POST',
    body: {
      fullName: `Демо проверка ${randomUUID()}`,
      birthDate: `${Number(today.slice(0, 4)) - 3}-01-01`,
      admissionDate: `${month}-01`, groupId: groups[0].id, comment: 'Disposable smoke test',
      contacts: [{ representativeName: 'Вымышленный представитель', phone: '+70000000000', relation: 'PARENT', comment: '' }],
    },
  });
  const roster = await request(`/groups/${groups[0].id}/attendance?date=${today}`, {
    token: teacher.accessToken,
  });
  assert.ok(roster.items.some(item => item.childId === child.id));
  await request(`/children/${child.id}/account`, { token: teacher.accessToken, expected: 403 });

  const calculation = await request(`/billing/months/${month}/calculate`, {
    token, method: 'POST', body: {},
  });
  const item = calculation.results.find(result => result.childId === child.id);
  assert.equal(item?.status, 'CALCULATED');
  const draft = await request(`/invoices/${item.invoiceId}`, { token });
  const invoice = await request(`/invoices/${draft.id}/issue`, {
    token, method: 'POST', body: { version: draft.version, dueDate: today }, key: randomUUID(),
  });
  assert.equal(invoice.amount, 50000);

  const paymentBody = { childId: child.id, amount: 25000, paidOn: today, method: 'CASH', comment: 'Демо проверка' };
  const paymentKey = randomUUID();
  const first = await request('/payments', { token, method: 'POST', body: paymentBody, key: paymentKey });
  const replay = await request('/payments', { token, method: 'POST', body: paymentBody, key: paymentKey });
  assert.deepEqual(replay, first);
  const account = await request(`/children/${child.id}/account`, { token });
  assert.equal(account.balance, 25000);

  const report = await request(`/reports/billing?month=${month}`, { token });
  assert.ok(report.rows.some(row => row.childId === child.id && row.balance === 25000));
  const csv = await fetch(`${baseUrl}/api/v1/reports/billing.csv?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000),
  });
  assert.equal(csv.status, 200);
  assert.ok((await csv.text()).includes(child.fullName));
  console.log('Demo smoke passed: frontend, migrations, login, teacher permissions, attendance roster, billing, payment replay, balance, report and CSV.');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
