const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export const api = {
  signup: (email, password) =>
    request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  verifyLogin2fa: (tempToken, code) =>
    request('/api/auth/login/2fa', { method: 'POST', body: JSON.stringify({ tempToken, code }) }),
  updateEmail: (email) =>
    request('/api/auth/email', { method: 'PATCH', body: JSON.stringify({ email }) }),
  googleLogin: (credential) =>
    request('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  forgotPassword: (email) =>
    request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) =>
    request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  verifyEmail: (token) =>
    request(`/api/auth/verify-email/${token}`, { method: 'GET' }),
  resendVerification: (email) =>
    request('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),

  twoFactor: {
    status: () => request('/api/auth/2fa/status'),
    setup: () => request('/api/auth/2fa/setup', { method: 'POST' }),
    verify: (code) => request('/api/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ code }) }),
    disable: (password) =>
      request('/api/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ password }) }),
    dismissPrompt: () => request('/api/auth/2fa/dismiss-prompt', { method: 'POST' }),
  },

  cli: {
    approve: (code) => request('/api/auth/cli/approve', { method: 'POST', body: JSON.stringify({ code }) }),
  },

  companies: {
    list: () => request('/api/companies'),
    create: (name) => request('/api/companies', { method: 'POST', body: JSON.stringify({ name }) }),
    get: (companySlug) => request(`/api/companies/${companySlug}`),
    update: (companySlug, name) =>
      request(`/api/companies/${companySlug}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    remove: (companySlug) => request(`/api/companies/${companySlug}`, { method: 'DELETE' }),
    members: (companySlug) => request(`/api/companies/${companySlug}/members`),

    invites: {
      list: (companySlug) => request(`/api/companies/${companySlug}/invites`),
      create: (companySlug, email, role) =>
        request(`/api/companies/${companySlug}/invites`, {
          method: 'POST',
          body: JSON.stringify({ email, role }),
        }),
      revoke: (companySlug, inviteId) =>
        request(`/api/companies/${companySlug}/invites/${inviteId}`, { method: 'DELETE' }),
    },

    projects: {
      list: (companySlug) => request(`/api/companies/${companySlug}/projects`),
      create: (companySlug, name) =>
        request(`/api/companies/${companySlug}/projects`, { method: 'POST', body: JSON.stringify({ name }) }),
      get: (companySlug, projectSlug) => request(`/api/companies/${companySlug}/projects/${projectSlug}`),
      update: (companySlug, projectSlug, name) =>
        request(`/api/companies/${companySlug}/projects/${projectSlug}`, {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        }),
      remove: (companySlug, projectSlug) =>
        request(`/api/companies/${companySlug}/projects/${projectSlug}`, { method: 'DELETE' }),

      createEnvironment: (companySlug, projectSlug, name) =>
        request(`/api/companies/${companySlug}/projects/${projectSlug}/environments`, {
          method: 'POST',
          body: JSON.stringify({ name }),
        }),

      listVariables: (companySlug, projectSlug, envId) =>
        request(`/api/companies/${companySlug}/projects/${projectSlug}/environments/${envId}/variables`),

      upsertVariable: (companySlug, projectSlug, envId, key, value, isSecret = true) =>
        request(`/api/companies/${companySlug}/projects/${projectSlug}/environments/${envId}/variables`, {
          method: 'POST',
          body: JSON.stringify({ key, value, is_secret: isSecret }),
        }),

      importVariables: (companySlug, projectSlug, envId, variables) =>
        request(`/api/companies/${companySlug}/projects/${projectSlug}/environments/${envId}/variables/bulk`, {
          method: 'POST',
          body: JSON.stringify({ variables }),
        }),

      deleteVariable: (companySlug, projectSlug, envId, varId) =>
        request(
          `/api/companies/${companySlug}/projects/${projectSlug}/environments/${envId}/variables/${varId}`,
          { method: 'DELETE' }
        ),
    },
  },

  invites: {
    get: (token) => request(`/api/invites/${token}`),
    accept: (token) => request(`/api/invites/${token}/accept`, { method: 'POST' }),
  },

  share: {
    create: (companyId, projectId, environmentId, expiryMinutes = 60, variableKeys = null) =>
      request('/api/share', {
        method: 'POST',
        body: JSON.stringify({ companyId, projectId, environmentId, expiryMinutes, variableKeys }),
      }),
    get: (token) => request(`/api/share/${token}`),
  },

  audit: {
  list: (companySlug, { page = 1, pageSize = 15, q = '', action = '' } = {}) => {
    const params = new URLSearchParams({ page, pageSize });
    if (q) params.set('q', q);
    if (action && action !== 'all') params.set('action', action);
    return request(`/api/audit/${companySlug}?${params.toString()}`);
  },
},

  compare: {
  get: (companySlug, projectSlug, { source, target, page = 1, pageSize = 15, q = '', status = 'all' }) => {
    const params = new URLSearchParams({ source, target, page, pageSize });
    if (q) params.set('q', q);
    if (status && status !== 'all') params.set('status', status);
    return request(`/api/companies/${companySlug}/projects/${projectSlug}/compare?${params.toString()}`);
  },
  reveal: (companySlug, projectSlug, environmentId, varId) =>
    request(`/api/companies/${companySlug}/projects/${projectSlug}/compare/reveal`, {
      method: 'POST',
      body: JSON.stringify({ environmentId, varId }),
    }),
  sync: (companySlug, projectSlug, sourceEnvId, targetEnvId, keys) =>
    request(`/api/companies/${companySlug}/projects/${projectSlug}/compare/sync`, {
      method: 'POST',
      body: JSON.stringify({ sourceEnvId, targetEnvId, keys }),
    }),
},

passkeys: {
    registerOptions: () => request('/api/auth/passkey/register/options', { method: 'POST' }),
    registerVerify: (response, name) =>
      request('/api/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({ response, name }),
      }),
    loginOptions: () => request('/api/auth/passkey/login/options', { method: 'POST' }),
    loginVerify: (response) =>
      request('/api/auth/passkey/login/verify', { method: 'POST', body: JSON.stringify({ response }) }),
    list: () => request('/api/auth/passkey/list'),
    remove: (id) => request(`/api/auth/passkey/${id}`, { method: 'DELETE' }),
  },
};