import { router, json, error, requireAuth, db, increment } from '@appdeploy/sdk';

function userTable(prefix: string, userId: string) {
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return prefix + '_' + (hash >>> 0).toString(36);
}
function cleanText(value: unknown, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function numeric(value: unknown, min = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min ? n : null;
}
const protectedRoute = requireAuth();
const tables: Record<string, string> = {
  sales: 'biz_sales', products: 'biz_products',
  expenses: 'biz_expenses', customers: 'biz_customers',
};
function updateRoute(kind: string) {
  return async (ctx: any) => {
    const table = userTable(tables[kind], ctx.user!.userId);
    const id = ctx.params.id;
    const body = (ctx.body || {}) as Record<string, unknown>;
    const [existing] = await db.get(table, [id]);
    if (!existing) return error('That record could not be found.', 404);
    let changes: Record<string, unknown>;
    if (kind === 'products') {
      const name = cleanText(body.name, 100);
      const price = numeric(body.price);
      const quantity = numeric(body.quantity);
      if (!name || price === null || quantity === null) return error('Enter a product name, valid price and quantity.', 400);
      changes = { name, price, quantity, category: cleanText(body.category, 80) };
    } else if (kind === 'customers') {
      const name = cleanText(body.name, 100);
      const balanceDue = numeric(body.balanceDue);
      if (!name || balanceDue === null) return error('Enter a customer name and valid outstanding balance.', 400);
      changes = { name, email: cleanText(body.email, 160), phone: cleanText(body.phone, 40), balanceDue };
    } else {
      const name = cleanText(body.name, 120);
      const amount = numeric(body.amount, 0.01);
      if (!name || amount === null) return error('Enter a description and a valid amount.', 400);
      changes = kind === 'sales'
        ? { name, amount, customer: cleanText(body.customer, 100) }
        : { name, amount, category: cleanText(body.category, 80) };
    }
    changes.updatedAt = new Date().toISOString();
    const [updated] = await db.tx.update(table, [{ id, record: changes }], { patch: true });
    return updated ? json({ updated: true }) : error('This record changed before it could be saved. Refresh and try again.', 409);
  };
}
function deleteRoute(kind: string) {
  return async (ctx: any) => {
    const [deleted] = await db.delete(userTable(tables[kind], ctx.user!.userId), [ctx.params.id]);
    return deleted ? json({ deleted: true }) : error('That record could not be found.', 404);
  };
}
export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'BizPocket API ready' })],
  'GET /api/business': [protectedRoute, async ctx => {
    const result = await db.list(userTable('biz_business', ctx.user!.userId), { limit: 2 });
    return json({ business: result.items[0] || null });
  }],
  'POST /api/business': [protectedRoute, async ctx => {
    const body = (ctx.body || {}) as Record<string, unknown>;
    const name = cleanText(body.name, 80), industry = cleanText(body.industry, 80), currency = cleanText(body.currency, 3);
    if (!name || !industry || !['NGN', 'GHS', 'USD', 'GBP'].includes(currency)) return error('Please provide a business name, industry and supported currency.', 400);
    const table = userTable('biz_business', ctx.user!.userId);
    const existing = await db.list(table, { limit: 1 });
    if (existing.items.length) return error('A business workspace already exists for this account.', 409);
    const [id] = await db.add(table, [{ name, industry, currency, createdAt: new Date().toISOString() }]);
    if (!id) return error('Business workspace could not be created.', 500);
    const [business] = await db.get(table, [id]);
    return json({ business: { ...business, id } }, 201);
  }],
  'GET /api/products': [protectedRoute, async ctx => json(await db.list(userTable('biz_products', ctx.user!.userId), { limit: 100 }))],
  'POST /api/products': [protectedRoute, async ctx => {
    const b = (ctx.body || {}) as Record<string, unknown>;
    const name = cleanText(b.name, 100), price = numeric(b.price), quantity = numeric(b.quantity);
    if (!name || price === null || quantity === null) return error('Enter a product name, valid price and quantity.', 400);
    const [id] = await db.add(userTable('biz_products', ctx.user!.userId), [{ name, price, quantity, category: cleanText(b.category, 80), createdAt: new Date().toISOString() }]);
    return id ? json({ id }, 201) : error('Product could not be saved.', 500);
  }],
  'PUT /api/products/:id': [protectedRoute, updateRoute('products')],
  'DELETE /api/products/:id': [protectedRoute, deleteRoute('products')],
  'GET /api/sales': [protectedRoute, async ctx => json(await db.list(userTable('biz_sales', ctx.user!.userId), { limit: 100 }))],
  'POST /api/sales': [protectedRoute, async ctx => {
    const b = (ctx.body || {}) as Record<string, unknown>;
    const name = cleanText(b.name, 120), amount = numeric(b.amount, 0.01);
    if (!name || amount === null) return error('Enter a sale description and a valid amount.', 400);
    const [id] = await db.add(userTable('biz_sales', ctx.user!.userId), [{ name, amount, customer: cleanText(b.customer, 100), createdAt: new Date().toISOString() }]);
    return id ? json({ id }, 201) : error('Sale could not be saved.', 500);
  }],
  'PUT /api/sales/:id': [protectedRoute, updateRoute('sales')],
  'DELETE /api/sales/:id': [protectedRoute, deleteRoute('sales')],
  'GET /api/expenses': [protectedRoute, async ctx => json(await db.list(userTable('biz_expenses', ctx.user!.userId), { limit: 100 }))],
  'POST /api/expenses': [protectedRoute, async ctx => {
    const b = (ctx.body || {}) as Record<string, unknown>;
    const name = cleanText(b.name, 120), amount = numeric(b.amount, 0.01);
    if (!name || amount === null) return error('Enter an expense description and a valid amount.', 400);
    const [id] = await db.add(userTable('biz_expenses', ctx.user!.userId), [{ name, amount, category: cleanText(b.category, 80), createdAt: new Date().toISOString() }]);
    return id ? json({ id }, 201) : error('Expense could not be saved.', 500);
  }],
  'PUT /api/expenses/:id': [protectedRoute, updateRoute('expenses')],
  'DELETE /api/expenses/:id': [protectedRoute, deleteRoute('expenses')],
  'GET /api/customers': [protectedRoute, async ctx => json(await db.list(userTable('biz_customers', ctx.user!.userId), { limit: 100 }))],
  'POST /api/customers': [protectedRoute, async ctx => {
    const b = (ctx.body || {}) as Record<string, unknown>;
    const name = cleanText(b.name, 100), balanceDue = numeric(b.balanceDue ?? 0);
    if (!name || balanceDue === null) return error('Enter a customer name and valid outstanding balance.', 400);
    const [id] = await db.add(userTable('biz_customers', ctx.user!.userId), [{ name, email: cleanText(b.email, 160), phone: cleanText(b.phone, 40), balanceDue, totalPaid: 0, createdAt: new Date().toISOString() }]);
    return id ? json({ id }, 201) : error('Customer could not be saved.', 500);
  }],
  'PUT /api/customers/:id': [protectedRoute, updateRoute('customers')],
  'DELETE /api/customers/:id': [protectedRoute, deleteRoute('customers')],
  'POST /api/customers/:id/payment': [protectedRoute, async ctx => {
    const body = (ctx.body || {}) as Record<string, unknown>;
    const amount = numeric(body.amount, 0.01);
    if (amount === null) return error('Enter a valid payment amount.', 400);
    const table = userTable('biz_customers', ctx.user!.userId);
    const [customer] = await db.get(table, [ctx.params.id]);
    if (!customer) return error('Customer could not be found.', 404);
    const due = numeric(customer.balanceDue ?? 0);
    if (due === null || due <= 0) return error('This customer has no outstanding balance.', 400);
    if (amount > due) return error('Payment cannot be greater than the outstanding balance.', 400);
    const remaining = Math.max(0, due - amount);
    const [updated] = await db.tx.update(table, [{ id: ctx.params.id, if: { balanceDue: customer.balanceDue }, record: { balanceDue: remaining, totalPaid: increment(amount), lastPaymentAt: new Date().toISOString() } }], { patch: true });
    return updated ? json({ balanceDue: remaining }) : error('The balance changed. Refresh the customer record and try again.', 409);
  }],
  'GET /api/invoices': [protectedRoute, async ctx => json(await db.list(userTable('biz_invoices', ctx.user!.userId), { limit: 200 }))],
  'POST /api/invoices': [protectedRoute, async ctx => {
    const b = (ctx.body || {}) as Record<string, unknown>;
    const customer = cleanText(b.customer, 100);
    const description = cleanText(b.description, 180);
    const quantity = numeric(b.quantity, 1);
    const unitPrice = numeric(b.unitPrice, 0.01);
    const dueDate = cleanText(b.dueDate, 10);
    if (!customer || !description || quantity === null || unitPrice === null || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return error('Complete the customer, item, quantity, price and due date.', 400);
    const now = new Date();
    const invoiceNo = 'BP-' + now.getTime().toString().slice(-8);
    const amount = quantity * unitPrice;
    const [id] = await db.add(userTable('biz_invoices', ctx.user!.userId), [{ invoiceNo, customer, description, quantity, unitPrice, amount, dueDate, status: 'Unpaid', createdAt: now.toISOString() }]);
    return id ? json({ id, invoiceNo }, 201) : error('Invoice could not be saved.', 500);
  }],
  'PUT /api/invoices/:id': [protectedRoute, async ctx => {
    const table = userTable('biz_invoices', ctx.user!.userId);
    const [existing] = await db.get(table, [ctx.params.id]);
    if (!existing) return error('Invoice could not be found.', 404);
    const body = (ctx.body || {}) as Record<string, unknown>;
    const status = cleanText(body.status, 20);
    if (!['Paid', 'Unpaid'].includes(status)) return error('Choose a valid invoice status.', 400);
    const [updated] = await db.tx.update(table, [{ id: ctx.params.id, record: { status, updatedAt: new Date().toISOString() } }], { patch: true });
    return updated ? json({ updated: true }) : error('Invoice could not be updated.', 500);
  }],
  'DELETE /api/invoices/:id': [protectedRoute, async ctx => {
    const [deleted] = await db.delete(userTable('biz_invoices', ctx.user!.userId), [ctx.params.id]);
    return deleted ? json({ deleted: true }) : error('Invoice could not be found.', 404);
  }],
});