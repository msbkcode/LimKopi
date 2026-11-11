// Lim Kopi — application shell (presentation wiring).
// Renders pages, collects form input and hands every user action to a Boundary object.
// Boundaries talk to Controls, Controls to Entities, Entities to server.py — never the reverse.
import { UserAccount } from './entities/UserAccount.js';
import { PERMISSIONS } from './entities/UserProfile.js';
import { IDPCategory } from './entities/IDPCategory.js';
import { IDP } from './entities/IDP.js';
import { Report } from './entities/Report.js';
import { api } from './api.js';
import { LoginForm } from './boundaries/LoginForm.js';
import { LogoutForm } from './boundaries/LogoutForm.js';
import { CreateUserProfileForm } from './boundaries/CreateUserProfileForm.js';
import { ViewUserProfileForm } from './boundaries/ViewUserProfileForm.js';
import { UpdateUserProfileForm } from './boundaries/UpdateUserProfileForm.js';
import { SuspendUserProfileForm } from './boundaries/SuspendUserProfileForm.js';
import { SearchUserProfileForm } from './boundaries/SearchUserProfileForm.js';
import { ActivateUserProfileForm } from './boundaries/ActivateUserProfileForm.js';
import { CreateUserAccountForm } from './boundaries/CreateUserAccountForm.js';
import { ViewUserAccountForm } from './boundaries/ViewUserAccountForm.js';
import { UpdateUserAccountForm } from './boundaries/UpdateUserAccountForm.js';
import { SuspendUserAccountForm } from './boundaries/SuspendUserAccountForm.js';
import { SearchUserAccountForm } from './boundaries/SearchUserAccountForm.js';
import { ActivateUserAccountForm } from './boundaries/ActivateUserAccountForm.js';
import { CreateCompanyInfoForm } from './boundaries/CreateCompanyInfoForm.js';
import { ViewCompanyInfoForm } from './boundaries/ViewCompanyInfoForm.js';
import { UpdateCompanyInfoForm } from './boundaries/UpdateCompanyInfoForm.js';
import { SuspendCompanyInfoForm } from './boundaries/SuspendCompanyInfoForm.js';
import { SearchCompanyInfoForm } from './boundaries/SearchCompanyInfoForm.js';
import { ActivateCompanyInfoForm } from './boundaries/ActivateCompanyInfoForm.js';
import { CreateCurrentIDPForm } from './boundaries/CreateCurrentIDPForm.js';
import { ViewCurrentIDPForm } from './boundaries/ViewCurrentIDPForm.js';
import { UpdateCurrentIDPForm } from './boundaries/UpdateCurrentIDPForm.js';
import { SuspendCurrentIDPForm } from './boundaries/SuspendCurrentIDPForm.js';
import { SearchCurrentIDPForm } from './boundaries/SearchCurrentIDPForm.js';
import { CreatePastIDPForm } from './boundaries/CreatePastIDPForm.js';
import { ViewPastIDPForm } from './boundaries/ViewPastIDPForm.js';
import { UpdatePastIDPForm } from './boundaries/UpdatePastIDPForm.js';
import { SuspendPastIDPForm } from './boundaries/SuspendPastIDPForm.js';
import { SearchPastIDPForm } from './boundaries/SearchPastIDPForm.js';
import { ActivateIDPForm } from './boundaries/ActivateIDPForm.js';
import { ViewIDPViewsForm } from './boundaries/ViewIDPViewsForm.js';
import { ViewIDPShortlistsForm } from './boundaries/ViewIDPShortlistsForm.js';
import { SearchNewIDPForm } from './boundaries/SearchNewIDPForm.js';
import { ViewIDPForm } from './boundaries/ViewIDPForm.js';
import { SaveFavouriteForm } from './boundaries/SaveFavouriteForm.js';
import { RemoveFavouriteForm } from './boundaries/RemoveFavouriteForm.js';
import { ViewShortlistedIDPForm } from './boundaries/ViewShortlistedIDPForm.js';
import { SearchShortlistedIDPForm } from './boundaries/SearchShortlistedIDPForm.js';
import { CreateIDPCategoryForm } from './boundaries/CreateIDPCategoryForm.js';
import { ViewIDPCategoryForm } from './boundaries/ViewIDPCategoryForm.js';
import { UpdateIDPCategoryForm } from './boundaries/UpdateIDPCategoryForm.js';
import { SuspendIDPCategoryForm } from './boundaries/SuspendIDPCategoryForm.js';
import { SearchIDPCategoryForm } from './boundaries/SearchIDPCategoryForm.js';
import { ActivateIDPCategoryForm } from './boundaries/ActivateIDPCategoryForm.js';
import { GenerateDailyReportForm } from './boundaries/GenerateDailyReportForm.js';
import { GenerateWeeklyReportForm } from './boundaries/GenerateWeeklyReportForm.js';
import { GenerateMonthlyReportForm } from './boundaries/GenerateMonthlyReportForm.js';
import { PredictFeasibilityForm } from './boundaries/PredictFeasibilityForm.js';
import { todaySGT } from './controllers/rules.js';

// ------------------------------------------------------------------ helpers
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (v) => 'S$' + Number(v || 0).toLocaleString('en-SG');
const dateStr = (v) => (v ? new Date(v).toLocaleDateString('en-SG') : '—');
const safeImg = (src) => /^https:\/\//i.test(src || '') || /^data:image\/(png|jpeg|webp);base64,/i.test(src || '');
const tag = (s) => `<span class="tag ${s === 'Active' || s === 'Past' ? 'good' : s === 'Suspended' ? 'bad' : 'warn'}">${esc(s)}</span>`;
const btn = (act, label, id = '', cls = '') => `<button type="button" class="btn tiny ${cls}" data-act="${esc(act)}" data-id="${esc(id)}">${label}</button>`;
const STYLES = ['Japandi', 'Industrial', 'Modern', 'Minimalist', 'Scandinavian', 'Contemporary'];
const REGIONS = ['Central', 'East', 'West', 'North', 'North-East'];
const PRED_CATEGORIES = ['Residential', 'Commercial', 'Hospitality'];

const state = { user: null, page: 'Overview', results: null, banner: null, cache: {}, categories: [], profileOptions: [] };
const can = (perm) => Boolean(state.user?.permissions?.includes(perm));

function toast(message, error = false) {
  const el = $('toast');
  el.textContent = message;
  el.className = 'toast' + (error ? ' err' : '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add('hidden'), 3800);
}

function openModal(title, html) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = html;
  $('modalLayer').classList.remove('hidden');
  $('modalBody').querySelector('input,select,textarea,button')?.focus();
}
function closeModal() { $('modalLayer').classList.add('hidden'); $('modalBody').innerHTML = ''; }
const modalOpen = () => !$('modalLayer').classList.contains('hidden');

function confirmDialog(message) {
  return new Promise((resolve) => {
    openModal('Please confirm', `<p>${esc(message)}</p><div class="footer">
      <button class="btn" type="button" id="confirmNo">Cancel</button>
      <button class="btn primary" type="button" id="confirmYes">Confirm</button></div>`);
    $('confirmYes').onclick = () => { closeModal(); resolve(true); };
    $('confirmNo').onclick = () => { closeModal(); resolve(false); };
  });
}

// ------------------------------------------------------------------ the View adapter given to every Boundary
function makeView(page) {
  return {
    success(message) { toast(message); closeModal(); state.results = null; state.banner = null; render(); },
    error(message) {
      const box = $('formError');
      if (modalOpen() && box) box.textContent = message;
      else { state.banner = { type: 'err', text: message }; showBanner(); toast(message, true); }
    },
    cancel() { closeModal(); },
    confirm: confirmDialog,
    show(label, record) { showDetail(page, label, record); },
    results(list) { state.results = list; state.banner = { type: 'info', text: `${list.length} matching record(s).` }; render(); },
    noResults(message) { state.results = []; state.banner = { type: 'info', text: message }; render(); },
    list(records, message = '') { state.cache[page] = records; if (message) state.banner = { type: 'err', text: message }; },
    count(idpId, value) { showCount(page, idpId, value); },
    home() { enterApp(); },
    login() { showLogin(); },
    report(r) { showReport(r, false); },
    noData(r) { showReport(r, true); },
    prediction(r) { showPrediction(r); },
    customerId() { return state.user?.id; },
  };
}

function showBanner() {
  const el = $('banner');
  if (!el) return;
  el.className = 'banner ' + (state.banner ? state.banner.type : 'hidden');
  el.textContent = state.banner?.text || '';
}

// ------------------------------------------------------------------ navigation
// Sidebar and page title share one correctly spelled label.
// Edit this one constant if you want to rename the menu item.
const IDP_CATEGORIES_LABEL = 'IDP Categories';
const NAV = [
  ['Overview', () => true],
  ['User Profiles', () => can('MANAGE_PROFILES')],
  ['User Accounts', () => can('MANAGE_ACCOUNTS')],
  ['Company Information', () => can('MANAGE_COMPANY')],
  ['Current IDPs', () => can('MANAGE_IDP')],
  ['Past IDPs', () => can('MANAGE_IDP')],
  ['IDP Analytics', () => can('MANAGE_IDP')],
  ['Explore IDPs', () => can('BROWSE_IDP')],
  ['My Shortlist', () => can('MANAGE_FAVOURITES')],
  [IDP_CATEGORIES_LABEL, () => can('MANAGE_CATEGORIES')],
  ['Reports', () => can('GENERATE_REPORTS')],
  ['Feasibility Predictor', () => can('MANAGE_IDP') || can('BROWSE_IDP')],
];

function navigate(page) {
  if (!NAV.some(([name, ok]) => name === page && ok())) return toast('This page is not available for your profile.', true);
  state.page = page; state.results = null; state.banner = null;
  render();
}

async function enterApp() {
  state.user = UserAccount.current;
  $('loginScreen').classList.add('hidden');
  $('appScreen').classList.remove('hidden');
  $('sideName').textContent = `${state.user.name} (@${state.user.username})`;
  $('sideRole').textContent = state.user.role;
  state.page = 'Overview'; state.results = null; state.banner = null; state.cache = {};
  await render();
}

function showLogin() {
  state.user = null; state.cache = {};
  closeModal();
  $('appScreen').classList.add('hidden');
  $('loginScreen').classList.remove('hidden');
  $('loginPassword').value = '';
}

function heading(title, description, actions = '') {
  return `<div class="heading"><div><div class="eyebrow">${esc(state.user.role)} workspace</div><h1>${esc(title)}</h1>
    <p>${esc(description)}</p></div><div class="row-actions">${actions}</div></div><div id="banner" class="hidden"></div>`;
}

// ------------------------------------------------------------------ resource page definitions (CRUDS + Search)
const RESOURCES = {
  'User Profiles': {
    kind: 'profiles', noun: 'user profile', desc: 'Role templates and their permissions.',
    view: ViewUserProfileForm, create: CreateUserProfileForm, update: UpdateUserProfileForm,
    suspend: SuspendUserProfileForm, activate: ActivateUserProfileForm, search: SearchUserProfileForm,
    cols: [['Role', (r) => `<b>${esc(r.role)}</b>`], ['Description', (r) => esc(r.description)],
      ['Permissions', (r) => esc((r.permissions || []).join(', '))], ['Status', (r) => tag(r.status)]],
  },
  'User Accounts': {
    kind: 'accounts', noun: 'user account', desc: 'Login credentials linked to a user profile.',
    view: ViewUserAccountForm, create: CreateUserAccountForm, update: UpdateUserAccountForm,
    suspend: SuspendUserAccountForm, activate: ActivateUserAccountForm, search: SearchUserAccountForm,
    cols: [['Username', (r) => `<b>${esc(r.username)}</b>`], ['Name', (r) => esc(r.name)], ['Email', (r) => esc(r.email)],
      ['Profile', (r) => esc(r.profile)], ['Status', (r) => tag(r.status)]],
  },
  'Company Information': {
    kind: 'companies', noun: 'company information', desc: 'Your registered design companies.',
    view: ViewCompanyInfoForm, create: CreateCompanyInfoForm, update: UpdateCompanyInfoForm,
    suspend: SuspendCompanyInfoForm, activate: ActivateCompanyInfoForm, search: SearchCompanyInfoForm,
    cols: [['Company', (r) => `<b>${esc(r.companyName)}</b>`], ['UEN', (r) => esc(r.uen)], ['Phone', (r) => esc(r.phone)],
      ['Email', (r) => esc(r.email)], ['Status', (r) => tag(r.status)]],
  },
  'Current IDPs': {
    kind: 'idps', stage: 'Current', noun: 'current IDP', desc: 'Ongoing projects in your portfolio.',
    view: ViewCurrentIDPForm, create: CreateCurrentIDPForm, update: UpdateCurrentIDPForm,
    suspend: SuspendCurrentIDPForm, activate: ActivateIDPForm, search: SearchCurrentIDPForm,
    cols: [['Title', (r) => `<b>${esc(r.title)}</b>`], ['Category', (r) => esc(categoryName(r.categoryId))],
      ['Style', (r) => esc(r.style)], ['Views', (r) => r.viewCount], ['Shortlists', (r) => r.shortlistCount], ['Status', (r) => tag(r.status)]],
  },
  'Past IDPs': {
    kind: 'idps', stage: 'Past', noun: 'past IDP', desc: 'Completed projects in your portfolio.',
    view: ViewPastIDPForm, create: CreatePastIDPForm, update: UpdatePastIDPForm,
    suspend: SuspendPastIDPForm, activate: ActivateIDPForm, search: SearchPastIDPForm,
    cols: [['Title', (r) => `<b>${esc(r.title)}</b>`], ['Category', (r) => esc(categoryName(r.categoryId))],
      ['Completed', (r) => esc(r.completionDate)], ['Views', (r) => r.viewCount], ['Shortlists', (r) => r.shortlistCount], ['Status', (r) => tag(r.status)]],
  },
  [IDP_CATEGORIES_LABEL]: {
    kind: 'categories', noun: 'IDP category', desc: 'Taxonomy used to organise IDPs.',
    view: null, list: ViewIDPCategoryForm, create: CreateIDPCategoryForm, update: UpdateIDPCategoryForm,
    suspend: SuspendIDPCategoryForm, activate: ActivateIDPCategoryForm, search: SearchIDPCategoryForm,
    cols: [['Category', (r) => `<b>${esc(r.name)}</b>`], ['Description', (r) => esc(r.description)], ['Status', (r) => tag(r.status)]],
  },
};

const categoryName = (id) => state.categories.find((c) => c.id === id)?.name || '—';

async function loadRecords(page, cfg) {
  const view = makeView(page);
  if (cfg.list) await new cfg.list(view).OnView();                // 6.2 View IDP Categories
  else await new cfg.view(view).OnViewAll();                        // View use case, normal-flow step 2
  return state.cache[page] || [];
}

async function renderResource(page, cfg) {
  const records = state.results ?? await loadRecords(page, cfg);
  const toolbar = `<form class="toolbar" id="searchForm" role="search">
      <input id="searchKeyword" type="search" placeholder="Search ${esc(cfg.kind === 'categories' ? 'IDP categories' : cfg.noun + 's')}..." aria-label="Search keyword">
      <button class="btn primary" type="submit">Search</button>
      ${state.results ? '<button class="btn" type="button" data-act="clear">Clear search</button>' : ''}</form>`;
  const rowsHtml = records.map((r) => `<tr>${cfg.cols.map(([, fn]) => `<td>${fn(r)}</td>`).join('')}<td><div class="row-actions">
      ${cfg.view ? btn('view', 'View', r.id) : ''}${btn('edit', 'Edit', r.id)}
      ${r.status === 'Suspended' ? btn('activate', 'Activate', r.id) : btn('suspend', 'Suspend', r.id, 'danger')}
      ${cfg.kind === 'idps' ? btn('views', 'Views', r.id) + btn('shortlists', 'Shortlists', r.id) : ''}</div></td></tr>`).join('');
  $('content').innerHTML = heading(page, cfg.desc, btn('create', `＋ Create ${esc(cfg.noun)}`, '', 'primary')) +
    `<section class="card">${toolbar}<div class="table-wrap"><table><thead><tr>${cfg.cols.map(([h]) => `<th>${esc(h)}</th>`).join('')}
      <th>Actions</th></tr></thead><tbody>${rowsHtml || `<tr><td colspan="${cfg.cols.length + 1}"><div class="empty">${state.results ? 'No matching records found.' : `No ${esc(cfg.noun)} records yet.`}</div></td></tr>`}</tbody></table></div>
      <p class="small muted">Showing ${records.length} record(s)</p></section>`;
  showBanner();
  $('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    new cfg.search(makeView(page)).OnSearch($('searchKeyword').value);
  });
}

// ------------------------------------------------------------------ forms
async function ensurePickers(kind) {
  if (kind === 'idps' && !state.categories.length) state.categories = await IDPCategory.GetActiveIDPCategories();
  if (kind === 'accounts') state.profileOptions = await UserAccount.GetProfileOptions();
}

function field(name, label, type = 'text', value = '', opts = {}) {
  const v = esc(value ?? '');
  const common = `id="f_${name}" name="${name}" ${opts.required === false ? '' : 'required'} ${opts.readonly ? 'readonly' : ''}`;
  let control;
  if (type === 'textarea') control = `<textarea ${common}>${v}</textarea>`;
  else if (type === 'select') control = `<select ${common}>${opts.options.map(([val, text, disabled]) =>
    `<option value="${esc(val)}" ${String(val) === String(value) ? 'selected' : ''} ${disabled ? 'data-suspended="1"' : ''}>${esc(text)}</option>`).join('')}</select>`;
  else control = `<input ${common} type="${type}" value="${v}" ${opts.max ? `max="${opts.max}"` : ''} ${type === 'number' ? 'min="0" step="1"' : ''}>`;
  return `<div class="field"><label for="f_${name}">${esc(label)}</label>${control}${opts.hint ? `<span class="hint">${esc(opts.hint)}</span>` : ''}</div>`;
}

function formFields(cfg, r) {
  const k = cfg.kind;
  if (k === 'profiles') {
    return field('role', 'Role', 'text', r?.role) + field('description', 'Description', 'textarea', r?.description) +
      `<div class="field"><label>Permissions</label><div class="checks">${PERMISSIONS.map((p) =>
        `<label><input type="checkbox" name="permissions" value="${p}" ${r?.permissions?.includes(p) ? 'checked' : ''}> ${p}</label>`).join('')}</div></div>`;
  }
  if (k === 'accounts') {
    const options = state.profileOptions.map((p) => [p.id, p.status === 'Active' ? p.role : `${p.role} (Suspended)`, p.status !== 'Active']);
    return (r ? field('username', 'Username', 'text', r.username, { readonly: true }) : field('username', 'Username', 'text', '', { hint: '3–30 letters, digits, . _ -' })) +
      field('email', 'Email', 'email', r?.email) + field('profileId', 'User profile', 'select', r?.profileId, { options }) +
      field('password', r ? 'New password (optional)' : 'Password', 'password', '', { required: !r, hint: '8–64 chars, upper, lower, number, symbol' }) +
      field('confirmPassword', 'Confirm password', 'password', '', { required: !r });
  }
  if (k === 'companies') {
    return field('companyName', 'Company name', 'text', r?.companyName) +
      field('uen', 'UEN', 'text', r?.uen, { readonly: Boolean(r), hint: r ? 'UEN cannot be changed.' : 'e.g. 201912345K' }) +
      field('address', 'Address', 'text', r?.address) + field('phone', 'Phone', 'tel', r?.phone, { hint: 'e.g. 62223333 or +65 91234567' }) +
      field('email', 'Email', 'email', r?.email) + field('description', 'Description', 'textarea', r?.description);
  }
  if (k === 'categories') return field('name', 'Category name', 'text', r?.name) + field('description', 'Description', 'textarea', r?.description);
  // IDPs
  const cats = state.categories.map((c) => [c.id, c.name]);
  return field('title', 'Title', 'text', r?.title) + field('description', 'Description', 'textarea', r?.description) +
    field('categoryId', 'Category', 'select', r?.categoryId, { options: cats }) +
    field('photos', 'Photo URLs (one per line)', 'textarea', (r?.photos || []).filter((p) => !p.startsWith('data:')).join('\n'), { required: false, hint: 'https:// links, or upload below. 1–4 photos.' }) +
    `<div class="field"><label for="f_upload">Upload photos (PNG/JPEG/WebP, under 300 KB)</label><input id="f_upload" type="file" accept="image/png,image/jpeg,image/webp" multiple>
      <span class="hint" id="uploadNote">${(r?.photos || []).filter((p) => p.startsWith('data:')).length} uploaded photo(s) kept.</span></div>` +
    (cfg.stage === 'Past' ? field('completionDate', 'Completion date', 'date', r?.completionDate, { max: todaySGT() }) : '') +
    field('style', 'Style', 'text', r?.style, { required: false }) + field('location', 'Location', 'text', r?.location, { required: false }) +
    field('budget', 'Budget (SGD)', 'number', r?.budget ?? '', { required: false }) + field('floorArea', 'Floor area (sq ft)', 'number', r?.floorArea ?? '', { required: false });
}

const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Could not read the photo.'));
  reader.readAsDataURL(file);
});

async function openForm(page, cfg, record = null) {
  await ensurePickers(cfg.kind);
  openModal(`${record ? 'Update' : 'Create'} ${cfg.noun}`, `<form id="recordForm" novalidate>${formFields(cfg, record)}
    <div class="form-error" id="formError" role="alert"></div>
    <div class="footer"><button class="btn" type="button" id="formCancel">Cancel</button>
    <button class="btn primary" type="submit">${record ? 'Save' : 'Create'}</button></div></form>`);
  const view = makeView(page);
  const boundary = record ? new cfg.update(view) : new cfg.create(view);
  $('formCancel').onclick = () => (record ? boundary.OnCancel() : closeModal());
  $('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('formError').textContent = '';
    const fd = new FormData(e.target);
    const v = (name) => String(fd.get(name) ?? '');
    const k = cfg.kind;
    if (k === 'profiles') {
      const perms = fd.getAll('permissions');
      return record ? boundary.OnUpdate(record.id, v('role'), v('description'), perms) : boundary.OnCreate(v('role'), v('description'), perms);
    }
    if (k === 'accounts') {
      if (v('password') !== v('confirmPassword')) { $('formError').textContent = 'Passwords do not match.'; return; }
      return record ? boundary.OnUpdate(record.id, v('email'), v('password'), v('profileId'))
        : boundary.OnCreate(v('username'), v('password'), v('email'), v('profileId'));
    }
    if (k === 'companies') {
      return record ? boundary.OnUpdate(record.id, v('companyName'), v('address'), v('phone'), v('email'), v('description'))
        : boundary.OnCreate(v('companyName'), v('uen'), v('address'), v('phone'), v('email'), v('description'));
    }
    if (k === 'categories') return record ? boundary.OnUpdate(record.id, v('name'), v('description')) : boundary.OnCreate(v('name'), v('description'));
    // IDPs — photos = URLs + newly uploaded files + previously uploaded files
    const files = [...$('f_upload').files];
    if (files.some((f) => f.size > 300 * 1024)) { $('formError').textContent = 'Each uploaded photo must be under 300 KB.'; return; }
    const uploads = await Promise.all(files.map(readFile));
    const kept = (record?.photos || []).filter((p) => p.startsWith('data:'));
    const photos = [...v('photos').split('\n').map((s) => s.trim()).filter(Boolean), ...kept, ...uploads];
    IDP.extras = { style: v('style'), location: v('location'), budget: v('budget'), floorArea: v('floorArea') };
    const args = [v('title'), v('description'), v('categoryId'), photos];
    if (cfg.stage === 'Past') args.push(v('completionDate'));
    return record ? boundary.OnUpdate(record.id, ...args) : boundary.OnCreate(...args);
  });
}

// ------------------------------------------------------------------ detail / count / report / prediction displays
function showDetail(page, label, r) {
  const skip = new Set(['id', 'ownerId', 'photos', 'password_salt', 'password_hash', 'idpId', 'profileId', 'accountId',
    'companyId', 'categoryId', 'category', 'categoryName', 'lastError', 'lastStatus']);
  const pretty = (key, val) => {
    if (Array.isArray(val)) return esc(val.join(', '));
    if (key === 'budget') return money(val);
    if (key.endsWith('At')) return dateStr(val);
    return esc(val);
  };
  const extra = r.categoryId ? `<b>category</b><span>${esc(r.categoryName || categoryName(r.categoryId))}</span>` : '';
  const photos = (r.photos || []).filter(safeImg).map((src) => `<img src="${esc(src)}" alt="${esc(r.title)} photo">`).join('');
  let actions = '';
  if (page === 'Explore IDPs' || page === 'My Shortlist') {
    const saved = state.cache.favouriteIds?.includes(r.id);
    actions = `<div class="footer">${saved ? btn('remove', '♥ Remove from favourites', r.id) : btn('save', '♡ Save to favourites', r.id, 'primary')}</div>`;
  }
  openModal(r.title || r.companyName || r.role || r.username || r.name || label,
    `${photos ? `<div class="photos">${photos}</div>` : ''}<div class="info">${extra}${Object.entries(r)
      .filter(([k, val]) => !skip.has(k) && val !== null && val !== undefined && val !== '' && typeof val !== 'function')
      .map(([k, val]) => `<b>${esc(k.replace(/([A-Z])/g, ' $1').toLowerCase())}</b><span>${pretty(k, val)}</span>`).join('')}</div>${actions}`);
}

function showCount(page, idpId, value) {
  const rec = (state.cache[page] || state.cache.analytics || []).find((x) => x.id === idpId);
  const isViews = state.lastCount === 'views';
  openModal(isViews ? 'Number of views' : 'Number of shortlists', `<p class="muted">${esc(rec?.title || idpId)}</p>
    <div class="stat"><span>${isViews ? 'Customers viewed this IDP' : 'Times this IDP was shortlisted'}</span><strong>${value}</strong></div>`);
}

function showReport(r, noData) {
  const box = $('reportResult');
  if (!box) return;
  const period = r.startDate === r.endDate ? r.startDate : `${r.startDate} → ${r.endDate}`;
  box.innerHTML = `<div class="card"><div class="between"><h2 style="font:22px Georgia,serif;margin:0">${esc(r.reportType)} report · ${esc(period)}</h2>${tag('Saved')}</div>
      ${noData ? '<p class="muted">No activity was recorded during this period. An empty report has still been saved.</p>' : ''}
      <div class="stats" style="margin:14px 0 0">${[['New IDPs', r.newIDPs], ['Views', r.views], ['Shortlists', r.shortlists], ['New accounts', r.newAccounts],
        ['Visible IDPs', r.activeIDPs], ['Active categories', r.activeCategories]].map(([l, n]) => `<div class="stat"><span>${l}</span><strong>${n}</strong></div>`).join('')}</div>
      <p class="small muted">Report ID: ${esc(r.id)}</p></div>`;
  toast(noData ? `${r.reportType} report saved (no activity).` : `${r.reportType} report generated.`);
  renderReportHistory();
}

function showPrediction(r) {
  const pct = r.probability < 0.01 ? '<1' : r.probability > 0.99 ? '>99' : Math.round(r.probability * 100);
  $('predictionResult').innerHTML = `<div class="card"><div class="between"><h2 style="font:22px Georgia,serif;margin:0">${esc(r.verdict)}</h2>
    ${tag(r.label ? 'Active' : 'Suspended').replace(r.label ? 'Active' : 'Suspended', r.label ? 'Low risk' : 'High risk')}</div>
    <p class="muted">Probability of finishing on budget and on time: <b>${pct}%</b> · risk score ${r.riskScore}/100</p>
    <div class="meter" aria-label="Success probability ${pct}%"><i style="width:${Math.round(r.probability * 100)}%"></i></div>
    <h3 style="font-size:13px;margin-top:16px">Main factors</h3><ul class="small">${r.topFactors.map((f) =>
      `<li>${esc(f.feature)} ${esc(f.effect)} the chance of success</li>`).join('')}</ul>
    <p class="hint">Model ${esc(r.modelVersion)} · decision support only — not a quotation or guarantee.</p></div>`;
}

// ------------------------------------------------------------------ page renderers
async function overview() {
  const data = await api('/api/bootstrap').catch(() => ({}));
  state.categories = data.categories?.filter((c) => c.status === 'Active') || state.categories;
  const stat = (label, value) => `<div class="stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  let stats = '';
  if (can('MANAGE_ACCOUNTS')) {
    stats = stat('User accounts', data.accounts.length) + stat('Active accounts', data.accounts.filter((a) => a.status === 'Active').length) +
      stat('User profiles', data.profiles.length) + stat('Suspended accounts', data.accounts.filter((a) => a.status === 'Suspended').length);
  } else if (can('MANAGE_IDP')) {
    const mine = data.idps || [];
    stats = stat('My IDPs', mine.length) + stat('Current', mine.filter((p) => p.stage === 'Current').length) +
      stat('Total views', mine.reduce((s, p) => s + p.viewCount, 0)) + stat('Total shortlists', mine.reduce((s, p) => s + p.shortlistCount, 0));
  } else if (can('BROWSE_IDP')) {
    const pub = data.publicIdps || [];
    stats = stat('IDPs to explore', pub.length) + stat('Past projects', pub.filter((p) => p.stage === 'Past').length) +
      stat('Current projects', pub.filter((p) => p.stage === 'Current').length) + stat('My shortlist', (data.favourites || []).length);
  } else if (can('GENERATE_REPORTS')) {
    stats = stat('Categories', data.categories.length) + stat('Active categories', data.categories.filter((c) => c.status === 'Active').length) +
      stat('Reports generated', (data.reports || []).length) + stat('Today (SGT)', todaySGT());
  }
  const next = NAV.filter(([, ok]) => ok()).map(([n]) => n).filter((n) => n !== 'Overview');
  $('content').innerHTML = heading(`Welcome, ${state.user.name}`, `Signed in as ${state.user.role}.`) +
    `<div class="stats">${stats}</div><section class="card"><h2 style="font-size:15px;margin-top:0">Quick links</h2>
    <div class="row-actions" style="justify-content:flex-start">${next.map((n) => `<button class="btn" type="button" data-page="${esc(n)}">${esc(n)}</button>`).join('')}</div></section>`;
}

async function analytics() {
  const [current, past] = await Promise.all([IDP.GetPortfolio('Current'), IDP.GetPortfolio('Past')]);
  const mine = [...current, ...past];
  state.cache.analytics = mine;
  $('content').innerHTML = heading('IDP Analytics', 'How many customers viewed and shortlisted each of your IDPs.') +
    `<div class="stats"><div class="stat"><span>My IDPs</span><strong>${mine.length}</strong></div>
      <div class="stat"><span>Total views</span><strong>${mine.reduce((s, p) => s + p.viewCount, 0)}</strong></div>
      <div class="stat"><span>Total shortlists</span><strong>${mine.reduce((s, p) => s + p.shortlistCount, 0)}</strong></div>
      <div class="stat"><span>Suspended</span><strong>${mine.filter((p) => p.status === 'Suspended').length}</strong></div></div>
    <section class="card"><div class="table-wrap"><table><thead><tr><th>IDP</th><th>Stage</th><th>Status</th><th>Interest</th></tr></thead><tbody>
    ${mine.map((p) => `<tr><td><b>${esc(p.title)}</b></td><td>${esc(p.stage)}</td><td>${tag(p.status)}</td><td><div class="row-actions" style="justify-content:flex-start">
      ${btn('views', 'View number of views', p.id)}${btn('shortlists', 'View number of shortlists', p.id)}</div></td></tr>`).join('') ||
      '<tr><td colspan="4"><div class="empty">No IDPs yet.</div></td></tr>'}</tbody></table></div></section>`;
}

function idpCards(list, page) {
  if (!list.length) return `<div class="empty">${state.results ? 'No matching IDPs found.' : page === 'My Shortlist' ? 'Your shortlist is empty. Save IDPs from Explore IDPs.' : 'No IDPs available yet.'}</div>`;
  return `<div class="grid">${list.map((p) => {
    const cover = (p.photos || []).find(safeImg);
    const saved = state.cache.favouriteIds?.includes(p.id);
    return `<article class="project">${cover ? `<img src="${esc(cover)}" alt="${esc(p.title)} cover photo">` : '<div class="cover"></div>'}
      <div class="inside"><div class="eyebrow">${esc(p.categoryName || '')} · ${esc(p.stage)}</div><h3>${esc(p.title)}</h3>
      <p>${esc(p.companyName || p.designerName || '')}${p.style ? ' · ' + esc(p.style) : ''}${p.location ? ' · ' + esc(p.location) : ''}</p>
      <p>${p.viewCount} views · ${p.shortlistCount} shortlists</p>
      <div class="row-actions" style="justify-content:flex-start">${btn('viewidp', 'View details', p.id, 'primary')}
      ${saved ? btn('remove', '♥ Remove', p.id) : btn('save', '♡ Save', p.id)}</div></div></article>`;
  }).join('')}</div>`;
}

async function refreshFavouriteIds() {
  const data = await api('/api/bootstrap').catch(() => ({}));
  state.cache.favouriteIds = data.favourites || [];
}

async function explore() {
  await refreshFavouriteIds();
  const list = state.results ?? await IDP.GetPublicIDPs();
  $('content').innerHTML = heading('Explore IDPs', 'Search interior design projects by title, style, location, category or designer.') +
    `<form class="toolbar" id="searchForm" role="search"><input id="searchKeyword" type="search" placeholder="e.g. Japandi, café, Tiong Bahru" aria-label="Search keyword">
      <button class="btn primary" type="submit">Search</button>${state.results ? '<button class="btn" type="button" data-act="clear">Clear search</button>' : ''}</form>` + idpCards(list, 'Explore IDPs');
  showBanner();
  $('searchForm').addEventListener('submit', (e) => { e.preventDefault(); new SearchNewIDPForm(makeView('Explore IDPs')).OnSearch($('searchKeyword').value); });
}

async function shortlist() {
  await refreshFavouriteIds();
  let list = state.results;
  if (!list) { await new ViewShortlistedIDPForm(makeView('My Shortlist')).OnView(); list = state.cache['My Shortlist'] || []; }
  $('content').innerHTML = heading('My Shortlist', 'Designs you saved to compare later.') +
    `<form class="toolbar" id="searchForm" role="search"><input id="searchKeyword" type="search" placeholder="Search your shortlist" aria-label="Search keyword">
      <button class="btn primary" type="submit">Search</button>${state.results ? '<button class="btn" type="button" data-act="clear">Clear search</button>' : ''}</form>` + idpCards(list, 'My Shortlist');
  showBanner();
  $('searchForm').addEventListener('submit', (e) => { e.preventDefault(); new SearchShortlistedIDPForm(makeView('My Shortlist')).OnSearch($('searchKeyword').value); });
}

const reportDateTime = (value) => value ? new Date(value).toLocaleString('en-SG', {
  timeZone: 'Asia/Singapore', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
}) : '—';

function reportHistoryRows(list) {
  const filter = $('reportTypeFilter')?.value || 'All';
  const shown = filter === 'All' ? list : list.filter((r) => r.reportType === filter);
  const el = $('reportHistory');
  if (!el) return;
  el.innerHTML = shown.map((r) => `<tr><td>${esc(r.reportType)}</td><td>${esc(r.startDate)}</td><td>${esc(r.endDate)}</td><td>${esc(reportDateTime(r.generatedAt))}</td>
    <td>${r.newIDPs}</td><td>${r.views}</td><td>${r.shortlists}</td><td>${r.newAccounts}</td>
    <td><div class="row-actions" style="justify-content:flex-start;white-space:nowrap">
      ${btn('report-view', 'View', r.id)}${btn('report-xlsx', 'Excel', r.id)}${btn('report-csv', 'CSV', r.id)}
    </div></td></tr>`).join('') || '<tr><td colspan="9">No reports for this selection.</td></tr>';
}

async function renderReportHistory() {
  const list = await Report.GetAllReports();
  state.reportHistory = list;
  reportHistoryRows(list);
}

async function viewSavedReport(id) {
  const r = await Report.GetReport(id);
  if (!r) return toast(Report.lastError || 'Could not load the selected report.', true);
  const period = r.startDate === r.endDate ? r.startDate : `${r.startDate} → ${r.endDate}`;
  const metrics = [['New IDPs', r.newIDPs], ['Views', r.views], ['Shortlists', r.shortlists],
    ['New accounts', r.newAccounts], ['Visible IDPs', r.activeIDPs], ['Active categories', r.activeCategories]];
  openModal(`${r.reportType} report`, `<p class="muted">${esc(period)} · Generated ${esc(reportDateTime(r.generatedAt))} (SGT)</p>
    <p class="small muted">Report ID: ${esc(r.id)}</p>
    <div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">${metrics.map(([name, value]) =>
      `<div class="stat"><span>${esc(name)}</span><strong>${Number(value) || 0}</strong></div>`).join('')}</div>
    <div class="footer">${btn('report-xlsx', 'Download Excel', r.id)}${btn('report-csv', 'Download CSV', r.id)}
      <button type="button" class="btn primary" data-close>Close</button></div>`);
}

async function reports() {
  const t = todaySGT();
  const weekStart = new Date(Date.parse(t) - 6 * 86400000).toISOString().slice(0, 10);
  const monthStart = t.slice(0, 8) + '01';
  $('content').innerHTML = heading('Reports', 'Generate platform activity reports for a day, a week or a month (Singapore time).') +
    `<div class="report-forms">
      <form class="card" id="dailyForm"><h3 style="margin-top:0">Daily report</h3>${field('date', 'Report date', 'date', t, { max: t })}<button class="btn primary" type="submit">Generate</button></form>
      <form class="card" id="weeklyForm"><h3 style="margin-top:0">Weekly report</h3>${field('wStart', 'Start date', 'date', weekStart, { max: t })}${field('wEnd', 'End date', 'date', t, { max: t })}<button class="btn primary" type="submit">Generate</button></form>
      <form class="card" id="monthlyForm"><h3 style="margin-top:0">Monthly report</h3>${field('mStart', 'Start date', 'date', monthStart, { max: t })}${field('mEnd', 'End date', 'date', t, { max: t })}<button class="btn primary" type="submit">Generate</button></form>
    </div><div id="reportResult"></div>
    <section class="card" style="margin-top:16px"><div class="between" style="margin-bottom:12px">
      <h2 style="font-size:15px;margin:0">Report history</h2>
      <select id="reportTypeFilter" aria-label="Filter report type" style="padding:8px;border:1px solid var(--line);border-radius:8px;background:white">
        <option value="All">All reports</option><option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option>
      </select></div><div class="table-wrap"><table>
    <thead><tr><th>Type</th><th>Start</th><th>End</th><th>Generated (SGT)</th><th>New IDPs</th><th>Views</th><th>Shortlists</th><th>New accounts</th><th>Actions</th></tr></thead>
    <tbody id="reportHistory"></tbody></table></div></section>`;
  showBanner();
  const view = makeView('Reports');
  // Disable Generate during an in-flight request to avoid accidental double-click duplicates.
  const bindGenerate = (formId, run) => $(formId).addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.currentTarget.querySelector('button[type="submit"]');
    if (button.disabled) return;
    button.disabled = true;
    try { await run(); } finally { button.disabled = false; }
  });
  bindGenerate('dailyForm', () => new GenerateDailyReportForm(view).OnGenerate($('f_date').value));
  bindGenerate('weeklyForm', () => new GenerateWeeklyReportForm(view).OnGenerate($('f_wStart').value, $('f_wEnd').value));
  bindGenerate('monthlyForm', () => new GenerateMonthlyReportForm(view).OnGenerate($('f_mStart').value, $('f_mEnd').value));
  $('reportTypeFilter').addEventListener('change', () => reportHistoryRows(state.reportHistory || []));
  await renderReportHistory();
}

async function predictor() {
  const opt = (list) => list.map((x) => [x, x]);
  $('content').innerHTML = heading('Feasibility Predictor', 'Estimate whether a planned renovation is likely to finish on budget and on time.') +
    `<div class="report-forms" style="grid-template-columns:1fr 1fr"><form class="card" id="predictForm">
      ${field('pCategory', 'Category', 'select', 'Residential', { options: opt(PRED_CATEGORIES) })}
      ${field('pStyle', 'Style', 'select', 'Japandi', { options: opt(STYLES) })}
      ${field('pRegion', 'Region', 'select', 'Central', { options: opt(REGIONS) })}
      ${field('pArea', 'Floor area (sq ft)', 'number', 1000)}${field('pBudget', 'Budget (SGD)', 'number', 60000)}
      ${field('pWeeks', 'Planned duration (weeks)', 'number', 10)}
      <button class="btn primary" type="submit">Predict</button></form><div id="predictionResult"><div class="empty">Fill in the project details and press Predict.</div></div></div>`;
  showBanner();
  $('predictForm').addEventListener('submit', (e) => {
    e.preventDefault();
    new PredictFeasibilityForm(makeView('Predictor')).OnPredict($('f_pCategory').value, $('f_pStyle').value, $('f_pRegion').value,
      $('f_pArea').value, $('f_pBudget').value, $('f_pWeeks').value);
  });
}

async function render() {
  if (!state.user) return;
  $('navigation').innerHTML = NAV.filter(([, ok]) => ok()).map(([name]) =>
    `<button type="button" data-page="${esc(name)}" class="${name === state.page ? 'active' : ''}" ${name === state.page ? 'aria-current="page"' : ''}>${esc(name)}</button>`).join('');
  const page = state.page;
  if (['Current IDPs', 'Past IDPs'].includes(page)) await ensurePickers('idps');
  if (RESOURCES[page]) return renderResource(page, RESOURCES[page]);
  const pages = { Overview: overview, 'IDP Analytics': analytics, 'Explore IDPs': explore, 'My Shortlist': shortlist, Reports: reports, 'Feasibility Predictor': predictor };
  return (pages[page] || overview)();
}

// ------------------------------------------------------------------ events
async function download(format, reportId) {
  if (!reportId) return toast('Select an individual report to download.', true);
  const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}.${format}`, { credentials: 'same-origin' });
  if (!response.ok) return toast('This report could not be exported.', true);
  const url = URL.createObjectURL(await response.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: `lim-kopi-${reportId}.${format}` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-close]') || e.target.id === 'modalLayer') return closeModal();
  const nav = e.target.closest('[data-page]');
  if (nav) return navigate(nav.dataset.page);
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const { act, id } = b.dataset;
  const page = state.page;
  const cfg = RESOURCES[page];
  const view = makeView(page);
  const records = state.results || state.cache[page] || state.cache.analytics || [];
  const record = records.find((r) => r.id === id);
  if (act === 'clear') { state.results = null; state.banner = null; return render(); }
  if (act === 'create') return openForm(page, cfg);
  if (act === 'edit') return openForm(page, cfg, record);
  if (act === 'view') return new cfg.view(view).OnView(id);
  if (act === 'suspend') return new cfg.suspend(view).OnSuspend(id);
  if (act === 'activate') return new cfg.activate(view).OnActivate(id);
  if (act === 'views') { state.lastCount = 'views'; return new ViewIDPViewsForm(view).OnView(id); }
  if (act === 'shortlists') { state.lastCount = 'shortlists'; return new ViewIDPShortlistsForm(view).OnView(id); }
  if (act === 'viewidp') return new ViewIDPForm(view).OnView(id);
  if (act === 'save') {
    const ok = await new SaveFavouriteForm({ ...view, success: (m) => { toast(m); closeModal(); render(); } }).OnSave(id);
    return ok;
  }
  if (act === 'remove') return new RemoveFavouriteForm({ ...view, success: (m) => { toast(m); closeModal(); state.results = null; render(); } }).OnRemove(id);
  if (act === 'report-view') return viewSavedReport(id);
  if (act === 'report-xlsx' || act === 'report-csv') return download(act.slice(7), id);
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalOpen()) closeModal(); });

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('loginError').textContent = '';
  const view = { home: enterApp, error: (m) => { $('loginError').textContent = m; } };
  await new LoginForm(view).OnLogin($('loginUsername').value, $('loginPassword').value);
});

$('logoutBtn').addEventListener('click', () => new LogoutForm({ login: showLogin }).OnLogout());

document.querySelectorAll('[data-auth]').forEach((tab) => tab.addEventListener('click', () => {
  const reg = tab.dataset.auth === 'register';
  $('loginForm').classList.toggle('hidden', reg);
  $('registerForm').classList.toggle('hidden', !reg);
  document.querySelectorAll('[data-auth]').forEach((t) => t.classList.toggle('active', t === tab));
}));

// Self-registration (Customer / Interior Designer) — outside the 48 stories, kept from the prototype.
$('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const v = (k) => String(fd.get(k) || '');
  if (v('password') !== v('confirmPassword')) { $('registerError').textContent = 'Passwords do not match.'; return; }
  const ok = await UserAccount.Register(v('username').trim(), v('name').trim(), v('email').trim(), v('password'), v('confirmPassword'), v('profile'));
  if (!ok) { $('registerError').textContent = UserAccount.lastError; return; }
  e.target.reset();
  document.querySelector('[data-auth="login"]').click();
  $('loginUsername').value = v('username');
  toast('Account created. Log in with your username and password.');
});

(async () => { if (await UserAccount.RestoreSession()) enterApp(); })();
