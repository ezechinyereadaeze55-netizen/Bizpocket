import { useEffect, useState } from 'react';
import { auth, api } from '@appdeploy/client';
import {
  Bell,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';

type User = { userId: string; email?: string; name?: string };
type Business = {
  id: string;
  name: string;
  industry: string;
  currency: string;
};
type Entry = {
  id: string;
  name?: string;
  amount?: number;
  price?: number;
  quantity?: number;
  customer?: string;
  createdAt?: string;
  category?: string;
  email?: string;
  phone?: string;
  balanceDue?: number;
  totalPaid?: number;
  invoiceNo?: string;
  dueDate?: string;
  status?: string;
  description?: string;
  unitPrice?: number;
};
type Page = 'Overview' | 'Sales' | 'Inventory' | 'Expenses' | 'Customers' | 'Invoices' | 'Reports';

const currencies = [
  { code: 'NGN', label: 'Nigerian Naira (₦)' },
  { code: 'GHS', label: 'Ghanaian Cedi (GH₵)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'GBP', label: 'British Pound (£)' },
];
const industries = [
  'Fashion & Clothing',
  'Food & Beverages',
  'Electronics',
  'Beauty & Cosmetics',
  'Retail & General Shop',
  'Online Business',
  'Home & Lifestyle',
  'Health & Wellness',
  'Services',
  'Other',
];
const money = (value: number, currency: string) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value || 0);

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">B</div>
      <span>
        biz<span>pocket</span>
        <small>BUSINESS, BEAUTIFULLY MANAGED</small>
      </span>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState<Page>('Overview');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [items, setItems] = useState<Record<string, Entry[]>>({
    sales: [],
    products: [],
    expenses: [],
    customers: [],
    invoices: [],
  });
  const [modal, setModal] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  async function refresh() {
    const [b, s, p, e, c, i] = await Promise.all([
      api.get('/api/business'),
      api.get('/api/sales'),
      api.get('/api/products'),
      api.get('/api/expenses'),
      api.get('/api/customers'),
      api.get('/api/invoices'),
    ]);
    setBusiness(b.data.business || null);
    setItems({
      sales: s.data.items || [],
      products: p.data.items || [],
      expenses: e.data.items || [],
      customers: c.data.items || [],
      invoices: i.data.items || [],
    });
  }

  useEffect(() => {
    let active = true;
    auth
      .getUser()
      .then(async current => {
        if (!active) return;
        setUser(current);
        if (current) {
          try {
            await refresh();
          } catch {
            setError(
              'We could not load your workspace. Refresh and try again.'
            );
          }
        }
      })
      .catch(() => setError('Sign-in could not be restored. Please refresh.'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function createBusiness(data: Record<string, string>) {
    setSaving(true);
    setError('');
    try {
      await api.post('/api/business', data);
      await refresh();
      setToast('Your business workspace is ready.');
    } catch {
      setError('We could not create your business. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function addEntry(kind: string, data: Record<string, string | number>) {
    setSaving(true);
    setError('');
    try {
      if (selectedEntry) await api.put('/api/' + kind + '/' + selectedEntry.id, data);
      else await api.post('/api/' + kind, data);
      await refresh();
      setModal('');
      setSelectedEntry(null);
      setToast(selectedEntry ? 'Changes saved successfully.' : 'Saved successfully.');
    } catch {
      setError('We could not save that record. Check the details and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(kind: string, entry: Entry) {
    if (!window.confirm('Delete "' + (entry.name || 'this record') + '"? This cannot be undone.')) return;
    setError('');
    try {
      await api.delete('/api/' + kind + '/' + entry.id);
      await refresh();
      setToast('Record deleted.');
    } catch {
      setError('We could not delete that record. Please refresh and try again.');
    }
  }

  async function createInvoice(data: Record<string, string | number>) {
    setSaving(true);
    setError('');
    try {
      await api.post('/api/invoices', data);
      await refresh();
      setModal('');
      setToast('Invoice created successfully.');
    } catch {
      setError('We could not create the invoice. Check the details and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function updateInvoiceStatus(invoice: Entry, status: string) {
    try {
      await api.put('/api/invoices/' + invoice.id, { status });
      await refresh();
      setToast('Invoice status updated.');
    } catch {
      setError('Invoice status could not be updated.');
    }
  }

  async function recordCustomerPayment(customer: Entry, amount: number) {
    setSaving(true);
    setError('');
    try {
      await api.post('/api/customers/' + customer.id + '/payment', { amount });
      await refresh();
      setModal('');
      setSelectedEntry(null);
      setToast('Customer payment recorded.');
    } catch {
      setError('Payment could not be recorded. Check the amount and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="loading-screen">
        <div className="brand-mark">B</div>
        <span>Preparing your workspace</span>
        <div className="loader" />
      </div>
    );

  if (!user)
    return (
      <main className="welcome">
        <nav className="welcome-nav">
          <Brand />
          <span className="nav-caption">BUSINESS, BEAUTIFULLY MANAGED</span>
        </nav>
        <section className="welcome-grid">
          <div className="welcome-copy">
            <div className="eyebrow">
              <span /> A clearer way to run your business
            </div>
            <h1>
              Make room for
              <br />
              <em>what matters.</em>
            </h1>
            <p>
              Sales, stock, expenses and customers — thoughtfully brought
              together in one calm, beautifully simple workspace.
            </p>
            <button
              className="button button-dark button-large"
              onClick={() =>
                auth
                  .signInWithRedirect()
                  .catch(() =>
                    setError('Sign-in could not start. Please try again.')
                  )
              }
            >
              Get started <span>↗</span>
            </button>
            <div className="welcome-note">
              <span className="avatar-stack">
                <i>✦</i>
                <i>✓</i>
                <i>+</i>
              </span>
              <span>Made for the people building something of their own.</span>
            </div>
            {error && <p className="error-text">{error}</p>}
          </div>
          <div className="welcome-art">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="preview-card">
              <div className="preview-top">
                <span>YOUR BUSINESS AT A GLANCE</span>
                <span className="live-dot" />
              </div>
              <div className="preview-title">
                A little more clarity.
                <br />
                <strong>A lot more possibility.</strong>
              </div>
              <div className="preview-chart">
                <div className="chart-label">
                  Sales overview <span>↗ 18.6%</span>
                </div>
                <div className="bars">
                  {[28, 42, 35, 58, 48, 70, 62, 86, 73, 100, 82, 94].map(
                    (v, i) => (
                      <i key={i} style={{ height: v + '%' }} />
                    )
                  )}
                </div>
                <div className="chart-axis">
                  <span>JAN</span>
                  <span>FEB</span>
                  <span>MAR</span>
                  <span>APR</span>
                </div>
              </div>
              <div className="preview-bottom">
                <div>
                  <small>SALES</small>
                  <b>₦2,480,000</b>
                </div>
                <div>
                  <small>ORDERS</small>
                  <b>128</b>
                </div>
                <div>
                  <small>GROWTH</small>
                  <b className="gold-text">+18.6%</b>
                </div>
              </div>
            </div>
            <div className="floating-note">
              <span className="note-icon">✦</span>
              <div>
                <b>Your business, in focus</b>
                <small>Everything in its right place.</small>
              </div>
            </div>
          </div>
        </section>
        <footer className="welcome-footer">
          <span>© 2026 BizPocket</span>
          <span>Clarity for every kind of business.</span>
          <span>BUILT FOR GROWTH</span>
        </footer>
      </main>
    );

  if (!business)
    return (
      <main className="setup-page">
        <div className="setup-top">
          <Brand />
          <button className="text-button" onClick={() => auth.signOut()}>
            Sign out
          </button>
        </div>
        <section className="setup-card">
          <div className="eyebrow">
            <span /> LET'S GET YOU SET UP
          </div>
          <h1>
            Tell us about
            <br />
            <em>your business.</em>
          </h1>
          <p>A few details will help us shape your BizPocket workspace.</p>
          <BusinessForm onSubmit={createBusiness} saving={saving} />
          {error && <p className="error-text">{error}</p>}
        </section>
        <div className="setup-foot">
          YOUR BUSINESS. YOUR NUMBERS. YOUR CONTROL.
        </div>
      </main>
    );

  const currency = business.currency;
  const totalSales = items.sales.reduce(
    (sum, x) => sum + Number(x.amount || 0),
    0
  );
  const totalExpenses = items.expenses.reduce(
    (sum, x) => sum + Number(x.amount || 0),
    0
  );
  const stockValue = items.products.reduce(
    (sum, x) => sum + Number(x.price || 0) * Number(x.quantity || 0),
    0
  );
  const nav = [
    { label: 'Overview' as Page, icon: LayoutDashboard },
    { label: 'Sales' as Page, icon: ShoppingCart },
    { label: 'Inventory' as Page, icon: Package },
    { label: 'Expenses' as Page, icon: Wallet },
    { label: 'Customers' as Page, icon: Users },
    { label: 'Invoices' as Page, icon: FileText },
    { label: 'Reports' as Page, icon: BarChart3 },
  ];
  const lists: Record<string, Entry[]> = {
    Sales: items.sales,
    Inventory: items.products,
    Expenses: items.expenses,
    Customers: items.customers,
    Invoices: items.invoices,
    Reports: [],
  };
  const addLabels: Record<string, string> = {
    Sales: 'Record a sale',
    Inventory: 'Add a product',
    Expenses: 'Add an expense',
    Customers: 'Add a customer',
    Invoices: 'Create an invoice',
    Reports: 'Reports',
  };
  const kinds: Record<string, string> = {
    Sales: 'sales',
    Inventory: 'products',
    Expenses: 'expenses',
    Customers: 'customers',
    Invoices: 'invoices',
  };
  const current = lists[page] || [];
  const filtered = current.filter(x =>
    (x.name || x.customer || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (mobileMenu ? 'sidebar-open' : '')}>
        <div className="sidebar-brand">
          <Brand />
          <button className="close-menu" onClick={() => setMobileMenu(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="business-switch">
          <div className="business-icon">
            {business.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <b>{business.name}</b>
            <small>{business.industry}</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="side-label">WORKSPACE</div>
        <div className="nav-list">
          {nav.map(n => (
            <button
              key={n.label}
              className={'nav-item ' + (page === n.label ? 'active' : '')}
              onClick={() => {
                setPage(n.label);
                setMobileMenu(false);
                setSearch('');
              }}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.label === 'Sales' && (
                <span className="nav-count">{items.sales.length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <CircleHelp size={18} />
            </div>
            <b>Need a hand?</b>
            <p>Your business journey, made simpler.</p>
            <button onClick={() => setToast('Help resources are coming soon.')}>
              Explore help ↗
            </button>
          </div>
          <button className="profile-row" onClick={() => auth.signOut()}>
            <div className="profile-avatar">
              {(user.name || user.email || 'B').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <b>{user.name || 'Business owner'}</b>
              <small>{user.email || 'Your account'}</small>
            </div>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      {mobileMenu && (
        <div className="scrim" onClick={() => setMobileMenu(false)} />
      )}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileMenu(true)}>
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span> <b>{page}</b>
          </div>
          <div className="top-actions">
            <span className="today-label">YOUR BUSINESS, IN FOCUS</span>
            <button
              className="icon-button"
              onClick={() => setToast('You are all caught up.')}
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            <div className="top-avatar">
              {(user.name || user.email || 'B').slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="content-area">
          {error && (
            <div className="inline-error">
              {error}
              <button onClick={() => setError('')}>
                <X size={15} />
              </button>
            </div>
          )}
          {page === 'Invoices' ? (
            <InvoicesPage invoices={items.invoices} currency={currency} onCreate={() => setModal('Invoice')} onStatus={updateInvoiceStatus} onDelete={deleteEntry} onPrint={invoice => printInvoiceReceipt(invoice, business)} />
          ) : page === 'Reports' ? (
            <ReportsPage sales={items.sales} expenses={items.expenses} currency={currency} />
          ) : page === 'Overview' ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span /> YOUR BUSINESS OVERVIEW
                  </div>
                  <h1>
                    Good to have you here
                    {user.name ? ', ' + user.name.split(' ')[0] : ''}.
                  </h1>
                  <p>Here's what's happening with {business.name} today.</p>
                </div>
                <button
                  className="button button-dark"
                  onClick={() => setModal('Sales')}
                >
                  <Plus size={17} /> Record a sale
                </button>
              </div>
              <div className="metric-grid">
                <Metric
                  title="Total sales"
                  value={money(totalSales, currency)}
                  note={items.sales.length + ' recorded sales'}
                  icon={ShoppingBag}
                  trend="Revenue recorded"
                />
                <Metric
                  title="Business expenses"
                  value={money(totalExpenses, currency)}
                  note={items.expenses.length + ' recorded expenses'}
                  icon={Wallet}
                  trend="Spending tracked"
                />
                <Metric
                  title="Net operating result"
                  value={money(totalSales - totalExpenses, currency)}
                  note="Sales less recorded expenses"
                  icon={TrendingUp}
                  trend={
                    totalSales >= totalExpenses
                      ? 'Positive balance'
                      : 'Review spending'
                  }
                />
                <Metric
                  title="Inventory value"
                  value={money(stockValue, currency)}
                  note={
                    items.products.reduce(
                      (sum, x) => sum + Number(x.quantity || 0),
                      0
                    ) + ' units in stock'
                  }
                  icon={Box}
                  trend={items.products.length + ' products'}
                />
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Sales activity</h2>
                      <p>Your latest recorded transactions</p>
                    </div>
                    <button
                      className="subtle-link"
                      onClick={() => setPage('Sales')}
                    >
                      View all ↗
                    </button>
                  </div>
                  {items.sales.length ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>SALE</th>
                            <th>DATE</th>
                            <th>AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.sales.slice(0, 5).map(x => (
                            <tr key={x.id}>
                              <td>
                                <b>{x.name || 'Sale'}</b>
                                <small>
                                  {x.customer || 'Walk-in customer'}
                                </small>
                              </td>
                              <td>
                                {x.createdAt
                                  ? new Date(x.createdAt).toLocaleDateString()
                                  : '—'}
                              </td>
                              <td className="amount-cell">
                                {money(Number(x.amount || 0), currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      title="Your sales will appear here"
                      text="Record your first sale to start seeing your business activity."
                      action="Record a sale"
                      onClick={() => setModal('Sales')}
                    />
                  )}
                </section>
                <section className="panel quick-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Quick actions</h2>
                      <p>Keep things moving</p>
                    </div>
                    <Sparkles size={18} className="gold-icon" />
                  </div>
                  <div className="quick-list">
                    <Quick
                      title="Record a sale"
                      desc="Add a new transaction"
                      icon={ShoppingCart}
                      onClick={() => setModal('Sales')}
                    />
                    <Quick
                      title="Add a product"
                      desc="Update your inventory"
                      icon={Package}
                      onClick={() => setModal('Inventory')}
                    />
                    <Quick
                      title="Log an expense"
                      desc="Keep spending organised"
                      icon={Wallet}
                      onClick={() => setModal('Expenses')}
                    />
                    <Quick
                      title="Add a customer"
                      desc="Grow your customer book"
                      icon={Users}
                      onClick={() => setModal('Customers')}
                    />
                  </div>
                </section>
              </div>
              <section className="panel lower-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Build your business picture</h2>
                    <p>Your workspace gets more useful with every record.</p>
                  </div>
                  <span className="progress-label">
                    {
                      [
                        items.sales,
                        items.products,
                        items.expenses,
                        items.customers,
                      ].filter(x => x.length > 0).length
                    }
                    /4 started
                  </span>
                </div>
                <div className="setup-progress">
                  {[
                    {
                      label: 'Record your first sale',
                      done: items.sales.length > 0,
                      go: () => setModal('Sales'),
                    },
                    {
                      label: 'Add products to inventory',
                      done: items.products.length > 0,
                      go: () => setModal('Inventory'),
                    },
                    {
                      label: 'Track an expense',
                      done: items.expenses.length > 0,
                      go: () => setModal('Expenses'),
                    },
                    {
                      label: 'Add a customer',
                      done: items.customers.length > 0,
                      go: () => setModal('Customers'),
                    },
                  ].map((x, i) => (
                    <button
                      key={i}
                      className={'progress-item ' + (x.done ? 'done' : '')}
                      onClick={x.go}
                    >
                      <span className="check-circle">
                        {x.done ? <Check size={13} /> : i + 1}
                      </span>
                      {x.label}
                      <span className="progress-arrow">↗</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span /> BUSINESS MANAGEMENT
                  </div>
                  <h1>{page}</h1>
                  <p>
                    {page === 'Sales'
                      ? 'Keep every transaction accounted for.'
                      : page === 'Inventory'
                        ? 'Know what you have, what is moving and what needs attention.'
                        : page === 'Expenses'
                          ? 'Keep a clear record of where your money goes.'
                          : 'Keep your customer relationships organised.'}
                  </p>
                </div>
                <button
                  className="button button-dark"
                  onClick={() => {
                    setSelectedEntry(null);
                    setModal(page);
                  }}
                >
                  <Plus size={17} />
                  {addLabels[page]}
                </button>
              </div>
              <section className="panel records-panel">
                <div className="records-toolbar">
                  <div>
                    <h2>{page} records</h2>
                    <p>
                      {current.length}{' '}
                      {current.length === 1 ? 'record' : 'records'} in your
                      workspace
                    </p>
                  </div>
                  <div className="search-box">
                    <Search size={16} />
                    <input
                      placeholder={'Search ' + page.toLowerCase() + '...'}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                      <button onClick={() => setSearch('')}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {filtered.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {page === 'Inventory' ? (
                            <>
                              <th>PRODUCT</th>
                              <th>PRICE</th>
                              <th>QUANTITY</th>
                              <th>STOCK VALUE</th>
                            </>
                          ) : page === 'Customers' ? (
                            <>
                              <th>CUSTOMER</th>
                              <th>EMAIL</th>
                              <th>PHONE</th>
                              <th>OUTSTANDING</th>
                            </>
                          ) : (
                            <>
                              <th>DESCRIPTION</th>
                              <th>DATE</th>
                              <th>AMOUNT</th>
                            </>
                          )}
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(x => (
                          <tr key={x.id}>
                            {page === 'Inventory' ? (
                              <>
                                <td>
                                  <b>{x.name}</b>
                                  <small>{x.category || 'Product'}</small>
                                </td>
                                <td>{money(Number(x.price || 0), currency)}</td>
                                <td>{x.quantity}</td>
                                <td className="amount-cell">
                                  {money(
                                    Number(x.price || 0) *
                                      Number(x.quantity || 0),
                                    currency
                                  )}
                                </td>
                              </>
                            ) : page === 'Customers' ? (
                              <>
                                <td>
                                  <b>{x.name}</b>
                                </td>
                                <td>{x.email || '—'}</td>
                                <td>{x.phone || '—'}</td>
                                <td className="amount-cell">{money(Number(x.balanceDue || 0), currency)}</td>
                              </>
                            ) : (
                              <>
                                <td>
                                  <b>{x.name || 'Entry'}</b>
                                  <small>
                                    {x.customer || x.category || ''}
                                  </small>
                                </td>
                                <td>
                                  {x.createdAt
                                    ? new Date(x.createdAt).toLocaleDateString()
                                    : '—'}
                                </td>
                                <td className="amount-cell">
                                  {money(Number(x.amount || 0), currency)}
                                </td>
                              </>
                            )}
                            <td className="record-actions">
                              <button className="row-action" onClick={() => { setSelectedEntry(x); setModal(page); }}>Edit</button>
                              {page === 'Customers' && Number(x.balanceDue || 0) > 0 && (
                                <button className="row-action row-action-accent" onClick={() => { setSelectedEntry(x); setModal('Payment'); }}>Record payment</button>
                              )}
                              <button className="row-action row-action-danger" onClick={() => deleteEntry(kinds[page], x)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title={'No ' + page.toLowerCase() + ' found'}
                    text={
                      search
                        ? 'Try another search term or clear your search.'
                        : 'Add your first record to start building a clearer picture of your business.'
                    }
                    action={search ? 'Clear search' : addLabels[page]}
                    onClick={() => (search ? setSearch('') : setModal(page))}
                  />
                )}
              </section>
            </>
          )}
          <footer className="app-footer">
            <span>© 2026 BizPocket</span>
            <span>Thoughtfully made for business owners.</span>
            <span>
              {business.currency} · {business.industry}
            </span>
          </footer>
        </div>
      </main>
      {modal === 'Invoice' && <InvoiceModal currency={currency} saving={saving} onClose={() => setModal('')} onSubmit={createInvoice} />}
      {modal && modal !== 'Payment' && modal !== 'Invoice' && (
        <EntryModal
          type={modal}
          currency={currency}
          saving={saving}
          initial={selectedEntry}
          onClose={() => { setModal(''); setSelectedEntry(null); }}
          onSubmit={(data: Record<string, string | number>) => addEntry(kinds[modal], data)}
        />
      )}
      {modal === 'Payment' && selectedEntry && (
        <PaymentModal
          customer={selectedEntry}
          currency={currency}
          saving={saving}
          onClose={() => { setModal(''); setSelectedEntry(null); }}
          onSubmit={(amount: number) => recordCustomerPayment(selectedEntry, amount)}
        />
      )}
      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
          <button onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function printInvoiceReceipt(invoice: Entry, business: Business) {
  const safe = (value: unknown) => String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char] || char));
  const popup = window.open('', '_blank', 'width=760,height=800');
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>Receipt ${safe(invoice.invoiceNo)}</title><style>body{font-family:Arial,sans-serif;color:#24231f;padding:42px;max-width:720px;margin:auto}header{display:flex;justify-content:space-between;border-bottom:2px solid #b89558;padding-bottom:20px}h1{font-size:28px;margin:0}small{color:#777}.meta{margin:28px 0;display:flex;justify-content:space-between}.line{padding:18px 0;border-bottom:1px solid #ddd}.total{text-align:right;font-size:22px;font-weight:bold;margin-top:24px}.status{display:inline-block;padding:7px 12px;background:#edf6ee;color:#28633b;border-radius:20px}footer{margin-top:55px;color:#777;font-size:12px}</style></head><body><header><div><h1>${safe(business.name)}</h1><small>INVOICE / PAYMENT RECEIPT</small></div><div><b>${safe(invoice.invoiceNo)}</b><br><small>${safe(new Date(invoice.createdAt || Date.now()).toLocaleDateString())}</small></div></header><div class="meta"><div><small>BILLED TO</small><br><b>${safe(invoice.customer)}</b></div><div><small>DUE DATE</small><br><b>${safe(invoice.dueDate)}</b></div></div><div class="line"><b>${safe(invoice.description)}</b><br><small>${safe(invoice.quantity)} × ${safe(money(Number(invoice.unitPrice || 0), business.currency))}</small></div><div class="total">Total: ${safe(money(Number(invoice.amount || 0), business.currency))}</div><p><span class="status">${safe(invoice.status || 'Unpaid')}</span></p><footer>Thank you for your business. Generated by BizPocket.</footer><script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
}

function InvoicesPage({ invoices, currency, onCreate, onStatus, onDelete, onPrint }: any) {
  return <><div className="page-heading"><div><div className="eyebrow"><span /> BILLING & PAYMENTS</div><h1>Invoices</h1><p>Create professional invoices and print receipts for your customers.</p></div><button className="button button-dark" onClick={onCreate}><Plus size={17} /> Create an invoice</button></div><section className="panel records-panel"><div className="records-toolbar"><div><h2>Invoice register</h2><p>{invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} in your workspace</p></div></div>{invoices.length ? <div className="table-wrap"><table><thead><tr><th>INVOICE</th><th>CUSTOMER</th><th>DUE DATE</th><th>AMOUNT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{invoices.map((invoice: Entry) => <tr key={invoice.id}><td><b>{invoice.invoiceNo}</b><small>{invoice.description}</small></td><td>{invoice.customer}</td><td>{invoice.dueDate}</td><td className="amount-cell">{money(Number(invoice.amount || 0), currency)}</td><td><span className={'invoice-status ' + (invoice.status === 'Paid' ? 'paid' : 'unpaid')}>{invoice.status || 'Unpaid'}</span></td><td className="record-actions"><button className="row-action" onClick={() => onPrint(invoice)}>Print receipt</button><button className="row-action row-action-accent" onClick={() => onStatus(invoice, invoice.status === 'Paid' ? 'Unpaid' : 'Paid')}>{invoice.status === 'Paid' ? 'Mark unpaid' : 'Mark paid'}</button><button className="row-action row-action-danger" onClick={() => onDelete('invoices', invoice)}>Delete</button></td></tr>)}</tbody></table></div> : <Empty title="No invoices yet" text="Create your first invoice to keep customer billing organised." action="Create an invoice" onClick={onCreate} />}</section></>;
}

function ReportsPage({ sales, expenses, currency }: any) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const inRange = (entry: Entry) => { const date = (entry.createdAt || '').slice(0, 10); return (!from || date >= from) && (!to || date <= to); };
  const filteredSales = sales.filter(inRange);
  const filteredExpenses = expenses.filter(inRange);
  const revenue = filteredSales.reduce((sum: number, item: Entry) => sum + Number(item.amount || 0), 0);
  const spending = filteredExpenses.reduce((sum: number, item: Entry) => sum + Number(item.amount || 0), 0);
  const exportCsv = () => { const rows = [['Type','Description','Date','Amount'], ...filteredSales.map((x: Entry) => ['Sale',x.name || '',(x.createdAt || '').slice(0,10),String(x.amount || 0)]), ...filteredExpenses.map((x: Entry) => ['Expense',x.name || '',(x.createdAt || '').slice(0,10),String(x.amount || 0)])]; const csv = rows.map(row => row.map(value => '"' + String(value).replace(/"/g,'""') + '"').join(',')).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'bizpocket-report.csv'; link.click(); URL.revokeObjectURL(link.href); };
  return <><div className="page-heading"><div><div className="eyebrow"><span /> BUSINESS INSIGHTS</div><h1>Performance reports</h1><p>Understand your recorded revenue, spending and operating result.</p></div><button className="button button-outline" onClick={exportCsv}>Export CSV ↓</button></div><section className="panel report-filters"><label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label><button className="button button-outline" onClick={() => {setFrom('');setTo('');}}>Clear dates</button></section><div className="metric-grid"><Metric title="Recorded sales" value={money(revenue,currency)} note={filteredSales.length + ' transactions'} icon={ShoppingBag} trend="Selected period"/><Metric title="Recorded expenses" value={money(spending,currency)} note={filteredExpenses.length + ' expenses'} icon={Wallet} trend="Selected period"/><Metric title="Net operating result" value={money(revenue-spending,currency)} note="Sales less expenses" icon={TrendingUp} trend={revenue >= spending ? 'Positive balance' : 'Review spending'}/></div><section className="panel"><div className="panel-heading"><div><h2>Report summary</h2><p>Based on records in the selected date range.</p></div></div><div className="report-summary"><div><small>SALES RECORDS</small><b>{filteredSales.length}</b></div><div><small>EXPENSE RECORDS</small><b>{filteredExpenses.length}</b></div><div><small>NET RESULT</small><b>{money(revenue-spending,currency)}</b></div></div></section></>;
}

function InvoiceModal({ currency, saving, onClose, onSubmit }: any) {
  const [customer,setCustomer] = useState(''); const [description,setDescription] = useState(''); const [quantity,setQuantity] = useState('1'); const [unitPrice,setUnitPrice] = useState(''); const [dueDate,setDueDate] = useState(new Date(Date.now()+7*86400000).toISOString().slice(0,10));
  return <div className="modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget) onClose();}}><form className="entry-modal" onSubmit={e => {e.preventDefault();onSubmit({customer,description,quantity:Number(quantity),unitPrice:Number(unitPrice),dueDate});}}><div className="modal-head"><div><div className="eyebrow"><span/> CUSTOMER BILLING</div><h2>Create an invoice</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={19}/></button></div><label>Customer name<input required maxLength={100} value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Customer or business name"/></label><label>Item or service description<input required maxLength={180} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What are you billing for?"/></label><div className="form-row"><label>Quantity<input type="number" min="1" step="1" required value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label>Unit price ({currency})<input type="number" min="0.01" step="0.01" required value={unitPrice} onChange={e=>setUnitPrice(e.target.value)}/></label></div><label>Due date<input type="date" required value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><p className="invoice-total-preview">Invoice total <b>{money(Number(quantity||0)*Number(unitPrice||0),currency)}</b></p><div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-dark" disabled={saving}>{saving?'Creating...':'Create invoice'} ↗</button></div></form></div>;
}

function Metric({ title, value, note, icon: Icon, trend }: any) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <div className="metric-icon">
          <Icon size={18} />
        </div>
      </div>
      <strong>{value}</strong>
      <div className="metric-foot">
        <span>{note}</span>
        <small>{trend}</small>
      </div>
    </div>
  );
}
function Empty({ title, text, action, onClick }: any) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <ShoppingCart size={22} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="button button-outline" onClick={onClick}>
        {action} ↗
      </button>
    </div>
  );
}
function Quick({ title, desc, icon: Icon, onClick }: any) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className="quick-icon">
        <Icon size={18} />
      </span>
      <span>
        <b>{title}</b>
        <small>{desc}</small>
      </span>
      <span className="quick-arrow">↗</span>
    </button>
  );
}
function BusinessForm({ onSubmit, saving }: any) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [currency, setCurrency] = useState('NGN');
  return (
    <form
      className="business-form"
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ name, industry, currency });
      }}
    >
      <label>
        Business name
        <input
          required
          maxLength={80}
          placeholder="e.g. The Good Store"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </label>
      <label>
        What kind of business do you run?
        <select
          required
          value={industry}
          onChange={e => setIndustry(e.target.value)}
        >
          <option value="">Choose your industry</option>
          {industries.map(x => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        Primary currency
        <select value={currency} onChange={e => setCurrency(e.target.value)}>
          {currencies.map(x => (
            <option value={x.code} key={x.code}>
              {x.label}
            </option>
          ))}
        </select>
      </label>
      <button
        className="button button-dark button-large"
        disabled={saving || !name.trim() || !industry}
      >
        {saving ? 'Creating workspace...' : 'Create my workspace'}{' '}
        <span>↗</span>
      </button>
    </form>
  );
}
function EntryModal({ type, currency, saving, onClose, onSubmit, initial }: any) {
  const [name, setName] = useState(initial?.name || '');
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '');
  const [quantity, setQuantity] = useState(initial?.quantity != null ? String(initial.quantity) : '1');
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '');
  const [customer, setCustomer] = useState(initial?.customer || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [category, setCategory] = useState(initial?.category || 'General');
  const [balanceDue, setBalanceDue] = useState(initial?.balanceDue != null ? String(initial.balanceDue) : '0');
  const product = type === 'Inventory',
    customerForm = type === 'Customers';
  const title = initial
    ? 'Edit ' + (customerForm ? 'customer' : product ? 'product' : type === 'Sales' ? 'sale' : 'expense')
    : type === 'Sales'
      ? 'Record a sale'
      : product
        ? 'Add a product'
        : type === 'Expenses'
          ? 'Add an expense'
          : 'Add a customer';
  function submit(e: any) {
    e.preventDefault();
    const data = product
      ? { name, price: Number(price), quantity: Number(quantity), category }
      : customerForm
        ? { name, email, phone, balanceDue: Number(balanceDue) }
        : {
            name,
            amount: Number(amount),
            ...(type === 'Sales' ? { customer } : { category }),
          };
    onSubmit(data);
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="entry-modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              <span /> BUSINESS RECORD
            </div>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <label>
          {customerForm
            ? 'Customer name'
            : product
              ? 'Product name'
              : 'Description'}
          <input
            autoFocus
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={
              customerForm
                ? 'Full name'
                : product
                  ? 'e.g. Classic T-shirt'
                  : type === 'Sales'
                    ? 'e.g. Weekend order'
                    : 'e.g. Packaging supplies'
            }
          />
        </label>
        {customerForm ? (
          <>
            <label>
              Email address
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@example.com" />
            </label>
            <label>
              Phone number
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
            </label>
            <label>
              Outstanding balance ({currency})
              <input type="number" min="0" step="0.01" required value={balanceDue} onChange={e => setBalanceDue(e.target.value)} placeholder="0.00" />
            </label>
          </>
        ) : product ? (
          <>
            <div className="form-row">
              <label>
                Unit price ({currency})
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label>
                Quantity in stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                />
              </label>
            </div>
            <label>
              Category
              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Clothing"
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Amount ({currency})
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </label>
            {type === 'Sales' ? (
              <label>
                Customer (optional)
                <input
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
                  placeholder="Customer or walk-in"
                />
              </label>
            ) : (
              <label>
                Expense category
                <input
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g. Transport, supplies"
                />
              </label>
            )}
          </>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button button-dark" disabled={saving}>
            {saving ? 'Saving...' : 'Save record'} <span>↗</span>
          </button>
        </div>
      </form>
    </div>
  );
}


function PaymentModal({ customer, currency, saving, onClose, onSubmit }: any) {
  const [amount, setAmount] = useState('');
  const due = Number(customer.balanceDue || 0);
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="entry-modal" onSubmit={e => { e.preventDefault(); onSubmit(Number(amount)); }}>
        <div className="modal-head">
          <div>
            <div className="eyebrow"><span /> CUSTOMER ACCOUNT</div>
            <h2>Record a payment</h2>
            <p className="payment-customer">{customer.name} · Outstanding {money(due, currency)}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}><X size={19} /></button>
        </div>
        <label>
          Amount received ({currency})
          <input autoFocus type="number" min="0.01" max={due} step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        </label>
        <div className="modal-actions">
          <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
          <button className="button button-dark" disabled={saving || !amount || Number(amount) > due}>{saving ? 'Recording...' : 'Save payment'} <span>↗</span></button>
        </div>
      </form>
    </div>
  );
}

export default App;
