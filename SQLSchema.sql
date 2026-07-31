create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamp default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  created_at timestamp default now()
);

create table environments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  created_at timestamp default now(),
  unique (project_id, name)
);

create table env_variables (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references environments(id) on delete cascade,
  key text not null,
  value_encrypted text not null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique (environment_id, key)
);

create index if not exists idx_environments_project_id on environments(project_id);

create index if not exists idx_env_variables_environment_id on env_variables(environment_id);

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references users(id) on delete cascade,
  created_at timestamp default now()
);

create table company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  joined_at timestamp default now(),
  unique (company_id, user_id)
);

create table invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member')),
  invited_by uuid not null references users(id) on delete cascade,
  token text unique not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamp default now(),
  expires_at timestamp not null
);

alter table projects add column if not exists company_id uuid references companies(id) on delete cascade;

do $$
declare
  r record;
  new_company_id uuid;
begin
  for r in select distinct owner_id from projects where owner_id is not null loop
    insert into companies (name, created_by)
    values ('My Workspace', r.owner_id)
    returning id into new_company_id;

    insert into company_members (company_id, user_id, role)
    values (new_company_id, r.owner_id, 'admin')
    on conflict do nothing;

    update projects set company_id = new_company_id where owner_id = r.owner_id;
  end loop;
end $$;

do $$
declare
  r record;
  new_company_id uuid;
begin
  for r in
    select u.id as user_id from users u
    where not exists (select 1 from company_members cm where cm.user_id = u.id)
  loop
    insert into companies (name, created_by)
    values ('My Workspace', r.user_id)
    returning id into new_company_id;

    insert into company_members (company_id, user_id, role)
    values (new_company_id, r.user_id, 'admin');
  end loop;
end $$;

alter table projects alter column company_id set not null;

alter table projects drop column if exists owner_id;

create index if not exists idx_company_members_user_id on company_members(user_id);

create index if not exists idx_company_members_company_id on company_members(company_id);

create index if not exists idx_invites_token on invites(token);

create index if not exists idx_invites_company_id on invites(company_id);

create index if not exists idx_projects_company_id on projects(company_id);

alter table env_variables
  add column if not exists is_secret boolean not null default true;

create table shared_links (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  encrypted_data text not null,        
  expires_at timestamp not null,
  viewed boolean not null default false,
  created_at timestamp default now()
);

create index if not exists idx_shared_links_token on shared_links(token);

create index if not exists idx_shared_links_expires_at on shared_links(expires_at);

alter table shared_links
  alter column expires_at type timestamptz using expires_at at time zone 'UTC';

alter table invites
  alter column expires_at type timestamptz using expires_at at time zone 'UTC';

alter table users
  add column if not exists two_factor_enabled boolean not null default false,
  add column if not exists two_factor_secret text;

alter table users alter column password_hash drop not null;
alter table users
  add column if not exists google_id text unique,
  add column if not exists reset_token_hash text,
  add column if not exists reset_token_expires timestamptz;
create index if not exists idx_users_google_id on users(google_id);
create index if not exists idx_users_reset_token_hash on users(reset_token_hash);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_email_verification_token_hash 
  ON users(email_verification_token_hash);

ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_prompted BOOLEAN DEFAULT FALSE;

create table if not exists cli_auth_requests (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'expired')),
  user_id uuid references users(id) on delete cascade,
  token text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_cli_auth_requests_code on cli_auth_requests(code);

ALTER TABLE companies ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE projects ADD COLUMN slug TEXT UNIQUE;

CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_projects_slug ON projects(slug);

SELECT id, name, slug FROM companies;
SELECT id, name, slug FROM projects;
SELECT id, name, slug FROM companies;

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "No updates on audit_logs"
  ON audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "No deletes on audit_logs"
  ON audit_logs FOR DELETE
  USING (false);

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_company_id ON audit_logs((metadata->>'companyId'));

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

create table if not exists passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_type text,
  backed_up boolean not null default false,
  transports text[],
  name text not null default 'Passkey',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists passkeys_user_id_idx on passkeys(user_id);

create table if not exists webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null unique,
  user_id uuid references users(id) on delete cascade,
  purpose text not null check (purpose in ('registration', 'authentication')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists webauthn_challenges_challenge_idx on webauthn_challenges(challenge);