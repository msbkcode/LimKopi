// Business rules shared by Control classes. They mirror the server-side validation in
// server.py so users get instant feedback; the server still re-checks everything.
export const PATTERNS = {
  username: /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/,
  email: /^[^\s@]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/,
  uen: /^(\d{8}[A-Z]|\d{9}[A-Z]|[TSR]\d{2}[A-Z]{2}\d{4}[A-Z])$/,
  phone: /^(\+65 ?)?[689]\d{7}$/,
  role: /^[A-Za-z][A-Za-z &/-]{1,49}$/,
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
};

const blank = (v) => v === undefined || v === null || String(v).trim() === '';

// Today's date in Singapore (the platform's business time zone), as YYYY-MM-DD.
export function todaySGT(now = Date.now()) {
  return new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export function strongPassword(pw) {
  return typeof pw === 'string' && pw.length >= 8 && pw.length <= 64 && /[A-Z]/.test(pw)
    && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9\s]/.test(pw);
}

export const rules = {
  keyword(searchKeyword) {
    return blank(searchKeyword) ? 'Please enter a search keyword.' : '';
  },
  id(value, label = 'record') {
    return blank(value) ? `Select a ${label} first.` : '';
  },
  profile(role, description, permissions) {
    if (blank(role) || blank(description) || !Array.isArray(permissions) || permissions.length === 0)
      return 'Role, description and at least one permission are required.';
    if (!PATTERNS.role.test(role.trim())) return "Role must be 2–50 letters, spaces, '&', '/' or '-'.";
    if (description.trim().length > 500) return 'Description must be at most 500 characters.';
    return '';
  },
  account(username, password, email, profile, { creating = true } = {}) {
    if ((creating && blank(username)) || blank(email) || blank(profile)) return 'Username, email and user profile are required.';
    if (creating && !PATTERNS.username.test(username.trim())) return 'Username must be 3–30 letters, digits, dots, dashes or underscores.';
    if (!PATTERNS.email.test(String(email).trim())) return 'Enter a valid email address.';
    if (creating && blank(password)) return 'A password is required.';
    if (!blank(password) && !strongPassword(password))
      return 'Password must have 8–64 characters with uppercase, lowercase, a number and a symbol.';
    return '';
  },
  company(companyName, uen, address, phone, email, description, { creating = true } = {}) {
    if ([companyName, address, phone, email, description].some(blank) || (creating && blank(uen)))
      return 'Company name, UEN, address, phone, email and description are required.';
    if (creating && !PATTERNS.uen.test(String(uen).trim().toUpperCase()))
      return 'UEN must be a valid Singapore UEN, e.g. 201912345K or 53312345D.';
    if (!PATTERNS.phone.test(String(phone).trim())) return 'Phone must be a Singapore number, e.g. 62223333 or +65 91234567.';
    if (!PATTERNS.email.test(String(email).trim())) return 'Enter a valid company email address.';
    return '';
  },
  idp(title, description, category, photos, completionDate, { past = false } = {}) {
    if ([title, description, category].some(blank) || !Array.isArray(photos) || photos.length === 0)
      return 'Title, description, category and photos are required.';
    if (photos.length > 4) return 'Add between 1 and 4 project photos.';
    if (past) {
      if (blank(completionDate) || !PATTERNS.isoDate.test(completionDate)) return 'Completion date is required (YYYY-MM-DD).';
      if (completionDate > todaySGT()) return 'Completion date cannot be in the future.';
    }
    return '';
  },
  category(name, description) {
    if (blank(name) || blank(description)) return 'Category name and description are required.';
    if (name.trim().length > 80 || description.trim().length > 500) return 'Name max 80 and description max 500 characters.';
    return '';
  },
  login(username, password) {
    return blank(username) || blank(password) ? 'Please enter your username and password.' : '';
  },
  period(startDate, endDate, maxDays, { sameMonth = false } = {}) {
    if (blank(startDate) || blank(endDate)) return 'Please select the report period.';
    if (!PATTERNS.isoDate.test(startDate) || !PATTERNS.isoDate.test(endDate)) return 'Dates must use YYYY-MM-DD.';
    if (startDate > endDate) return 'Start date must be on or before the end date.';
    if (endDate > todaySGT()) return 'The report period cannot lie in the future.';
    const days = Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1;
    if (days > maxDays) return `This report covers at most ${maxDays} day(s); you selected ${days}.`;
    if (sameMonth && startDate.slice(0, 7) !== endDate.slice(0, 7)) return 'A monthly report must stay within one calendar month.';
    return '';
  },
};
