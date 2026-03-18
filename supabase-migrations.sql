-- =============================================================================
-- TaskFlow - Complete Supabase Migration
-- Idempotent: safe to run multiple times
-- =============================================================================

-- ============================================================
-- 1. TABLE CREATION
-- ============================================================

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- workspace_members
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'guest')),
  joined_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#6366f1',
  created_at timestamptz default now()
);

-- team_members
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  unique(team_id, user_id)
);

-- projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  description text,
  color text not null default '#6366f1',
  icon text not null default 'folder',
  status text not null default 'active' check (status in ('active', 'archived', 'completed')),
  privacy text not null default 'workspace' check (privacy in ('workspace', 'team', 'private')),
  default_view text not null default 'list' check (default_view in ('list', 'board', 'timeline', 'calendar')),
  start_date date,
  due_date date,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- project_members
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'commenter', 'viewer')),
  unique(project_id, user_id)
);

-- sections
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  color text,
  created_at timestamptz default now()
);

-- tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'none' check (priority in ('none', 'low', 'medium', 'high', 'urgent')),
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  due_date date,
  start_date date,
  completed_at timestamptz,
  position integer not null default 0,
  is_milestone boolean not null default false,
  estimated_hours numeric,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- task_dependencies
create table if not exists public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  depends_on_id uuid references public.tasks(id) on delete cascade,
  dependency_type text not null default 'finish_to_start',
  unique(task_id, depends_on_id)
);

-- task_followers
create table if not exists public.task_followers (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  unique(task_id, user_id)
);

-- comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  body text not null,
  is_edited boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- attachments
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size_bytes bigint,
  created_at timestamptz default now()
);

-- custom_fields
create table if not exists public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  field_type text not null check (field_type in ('text', 'number', 'date', 'select', 'multi_select', 'checkbox')),
  options jsonb,
  position integer not null default 0
);

-- custom_field_values
create table if not exists public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  field_id uuid references public.custom_fields(id) on delete cascade,
  value text,
  unique(task_id, field_id)
);

-- notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('task_assigned', 'task_commented', 'task_completed', 'mentioned', 'due_soon')),
  title text not null,
  body text,
  resource_type text check (resource_type in ('task', 'project', 'comment')),
  resource_id uuid,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

-- activity_log
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  task_id uuid references public.tasks(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  action text not null,
  field_changed text,
  old_value text,
  new_value text,
  created_at timestamptz default now()
);

-- portfolios
create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- portfolio_projects
create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references public.portfolios(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  unique(portfolio_id, project_id)
);


-- ============================================================
-- 2. ENABLE ROW LEVEL SECURITY ON EVERY TABLE
-- ============================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.sections enable row level security;
alter table public.tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.task_followers enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.custom_fields enable row level security;
alter table public.custom_field_values enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_log enable row level security;
alter table public.portfolios enable row level security;
alter table public.portfolio_projects enable row level security;


-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

-- ---- profiles ----
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ---- workspaces ----
drop policy if exists "workspaces_select" on public.workspaces;
create policy "workspaces_select" on public.workspaces
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "workspaces_insert" on public.workspaces;
create policy "workspaces_insert" on public.workspaces
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "workspaces_update" on public.workspaces;
create policy "workspaces_update" on public.workspaces
  for update using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')
    )
  );

drop policy if exists "workspaces_delete" on public.workspaces;
create policy "workspaces_delete" on public.workspaces
  for delete using (owner_id = auth.uid());

-- ---- workspace_members ----
drop policy if exists "workspace_members_select" on public.workspace_members;
create policy "workspace_members_select" on public.workspace_members
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "workspace_members_insert" on public.workspace_members;
create policy "workspace_members_insert" on public.workspace_members
  for insert with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')
    )
    or (user_id = auth.uid()) -- allow self-join for workspace creation flow
  );

drop policy if exists "workspace_members_delete" on public.workspace_members;
create policy "workspace_members_delete" on public.workspace_members
  for delete using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')
    )
    or (user_id = auth.uid()) -- allow self-remove
  );

-- ---- teams ----
drop policy if exists "teams_select" on public.teams;
create policy "teams_select" on public.teams
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = teams.workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "teams_insert" on public.teams;
create policy "teams_insert" on public.teams
  for insert with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = teams.workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "teams_update" on public.teams;
create policy "teams_update" on public.teams
  for update using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = teams.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')
    )
  );

drop policy if exists "teams_delete" on public.teams;
create policy "teams_delete" on public.teams
  for delete using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = teams.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')
    )
  );

-- ---- team_members ----
drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select" on public.team_members
  for select using (
    exists (
      select 1 from public.teams t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = team_members.team_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "team_members_insert" on public.team_members;
create policy "team_members_insert" on public.team_members
  for insert with check (
    exists (
      select 1 from public.teams t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = team_members.team_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "team_members_delete" on public.team_members;
create policy "team_members_delete" on public.team_members
  for delete using (
    exists (
      select 1 from public.teams t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = team_members.team_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')
    )
    or (user_id = auth.uid())
  );

-- ---- projects ----
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select using (
    -- workspace-privacy: any workspace member can see
    (privacy = 'workspace' and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid()
    ))
    -- team-privacy: team members can see
    or (privacy = 'team' and exists (
      select 1 from public.team_members tm
      where tm.team_id = projects.team_id and tm.user_id = auth.uid()
    ))
    -- private: only project members can see
    or (privacy = 'private' and exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id and pm.user_id = auth.uid()
    ))
  );

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects
  for insert with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects
  for update using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects
  for delete using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id and pm.user_id = auth.uid() and pm.role = 'owner'
    )
  );

-- ---- project_members ----
drop policy if exists "project_members_select" on public.project_members;
create policy "project_members_select" on public.project_members
  for select using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists "project_members_insert" on public.project_members;
create policy "project_members_insert" on public.project_members
  for insert with check (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
    or (user_id = auth.uid()) -- allow self-add during project creation
  );

drop policy if exists "project_members_delete" on public.project_members;
create policy "project_members_delete" on public.project_members
  for delete using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
    or (user_id = auth.uid())
  );

-- ---- sections ----
drop policy if exists "sections_select" on public.sections;
create policy "sections_select" on public.sections
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = sections.project_id
      and (
        (p.privacy = 'workspace' and exists (
          select 1 from public.workspace_members wm where wm.workspace_id = p.workspace_id and wm.user_id = auth.uid()
        ))
        or (p.privacy = 'team' and exists (
          select 1 from public.team_members tm where tm.team_id = p.team_id and tm.user_id = auth.uid()
        ))
        or (p.privacy = 'private' and exists (
          select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()
        ))
      )
    )
  );

drop policy if exists "sections_insert" on public.sections;
create policy "sections_insert" on public.sections
  for insert with check (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = sections.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

drop policy if exists "sections_update" on public.sections;
create policy "sections_update" on public.sections
  for update using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = sections.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

drop policy if exists "sections_delete" on public.sections;
create policy "sections_delete" on public.sections
  for delete using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = sections.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

-- ---- tasks ----
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = tasks.project_id
      and (
        (p.privacy = 'workspace' and exists (
          select 1 from public.workspace_members wm where wm.workspace_id = p.workspace_id and wm.user_id = auth.uid()
        ))
        or (p.privacy = 'team' and exists (
          select 1 from public.team_members tm where tm.team_id = p.team_id and tm.user_id = auth.uid()
        ))
        or (p.privacy = 'private' and exists (
          select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()
        ))
      )
    )
    -- also allow if user is assignee (for "My Tasks" across projects)
    or (assignee_id = auth.uid())
  );

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = tasks.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = tasks.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
    or (assignee_id = auth.uid())
  );

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = tasks.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

-- ---- task_dependencies ----
drop policy if exists "task_dependencies_select" on public.task_dependencies;
create policy "task_dependencies_select" on public.task_dependencies
  for select using (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_dependencies.task_id
      and (
        (p.privacy = 'workspace' and exists (
          select 1 from public.workspace_members wm where wm.workspace_id = p.workspace_id and wm.user_id = auth.uid()
        ))
        or (p.privacy = 'team' and exists (
          select 1 from public.team_members tm where tm.team_id = p.team_id and tm.user_id = auth.uid()
        ))
        or (p.privacy = 'private' and exists (
          select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()
        ))
      )
    )
  );

drop policy if exists "task_dependencies_insert" on public.task_dependencies;
create policy "task_dependencies_insert" on public.task_dependencies
  for insert with check (
    exists (
      select 1 from public.tasks t
      join public.project_members pm on pm.project_id = t.project_id
      where t.id = task_dependencies.task_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

drop policy if exists "task_dependencies_delete" on public.task_dependencies;
create policy "task_dependencies_delete" on public.task_dependencies
  for delete using (
    exists (
      select 1 from public.tasks t
      join public.project_members pm on pm.project_id = t.project_id
      where t.id = task_dependencies.task_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

-- ---- task_followers ----
drop policy if exists "task_followers_select" on public.task_followers;
create policy "task_followers_select" on public.task_followers
  for select using (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_followers.task_id
      and (
        (p.privacy = 'workspace' and exists (
          select 1 from public.workspace_members wm where wm.workspace_id = p.workspace_id and wm.user_id = auth.uid()
        ))
        or (p.privacy = 'team' and exists (
          select 1 from public.team_members tm where tm.team_id = p.team_id and tm.user_id = auth.uid()
        ))
        or (p.privacy = 'private' and exists (
          select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()
        ))
      )
    )
  );

drop policy if exists "task_followers_insert" on public.task_followers;
create policy "task_followers_insert" on public.task_followers
  for insert with check (
    user_id = auth.uid() -- users can follow tasks they have access to
    and exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_followers.task_id
      and (
        (p.privacy = 'workspace' and exists (
          select 1 from public.workspace_members wm where wm.workspace_id = p.workspace_id and wm.user_id = auth.uid()
        ))
        or (p.privacy = 'team' and exists (
          select 1 from public.team_members tm where tm.team_id = p.team_id and tm.user_id = auth.uid()
        ))
        or (p.privacy = 'private' and exists (
          select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()
        ))
      )
    )
  );

drop policy if exists "task_followers_delete" on public.task_followers;
create policy "task_followers_delete" on public.task_followers
  for delete using (user_id = auth.uid());

-- ---- comments ----
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select using (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = comments.task_id
      and (
        (p.privacy = 'workspace' and exists (
          select 1 from public.workspace_members wm where wm.workspace_id = p.workspace_id and wm.user_id = auth.uid()
        ))
        or (p.privacy = 'team' and exists (
          select 1 from public.team_members tm where tm.team_id = p.team_id and tm.user_id = auth.uid()
        ))
        or (p.privacy = 'private' and exists (
          select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()
        ))
      )
    )
  );

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      join public.project_members pm on pm.project_id = t.project_id
      where t.id = comments.task_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists "comments_update" on public.comments;
create policy "comments_update" on public.comments
  for update using (user_id = auth.uid());

drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments
  for delete using (user_id = auth.uid());

-- ---- attachments ----
drop policy if exists "attachments_select" on public.attachments;
create policy "attachments_select" on public.attachments
  for select using (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = attachments.task_id
      and (
        (p.privacy = 'workspace' and exists (
          select 1 from public.workspace_members wm where wm.workspace_id = p.workspace_id and wm.user_id = auth.uid()
        ))
        or (p.privacy = 'team' and exists (
          select 1 from public.team_members tm where tm.team_id = p.team_id and tm.user_id = auth.uid()
        ))
        or (p.privacy = 'private' and exists (
          select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()
        ))
      )
    )
  );

drop policy if exists "attachments_insert" on public.attachments;
create policy "attachments_insert" on public.attachments
  for insert with check (
    exists (
      select 1 from public.tasks t
      join public.project_members pm on pm.project_id = t.project_id
      where t.id = attachments.task_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists "attachments_delete" on public.attachments;
create policy "attachments_delete" on public.attachments
  for delete using (uploaded_by = auth.uid());

-- ---- custom_fields ----
drop policy if exists "custom_fields_select" on public.custom_fields;
create policy "custom_fields_select" on public.custom_fields
  for select using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = custom_fields.project_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists "custom_fields_insert" on public.custom_fields;
create policy "custom_fields_insert" on public.custom_fields
  for insert with check (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = custom_fields.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

drop policy if exists "custom_fields_update" on public.custom_fields;
create policy "custom_fields_update" on public.custom_fields
  for update using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = custom_fields.project_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

drop policy if exists "custom_fields_delete" on public.custom_fields;
create policy "custom_fields_delete" on public.custom_fields
  for delete using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = custom_fields.project_id and pm.user_id = auth.uid() and pm.role = 'owner'
    )
  );

-- ---- custom_field_values ----
drop policy if exists "custom_field_values_select" on public.custom_field_values;
create policy "custom_field_values_select" on public.custom_field_values
  for select using (
    exists (
      select 1 from public.custom_fields cf
      join public.project_members pm on pm.project_id = cf.project_id
      where cf.id = custom_field_values.field_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists "custom_field_values_insert" on public.custom_field_values;
create policy "custom_field_values_insert" on public.custom_field_values
  for insert with check (
    exists (
      select 1 from public.custom_fields cf
      join public.project_members pm on pm.project_id = cf.project_id
      where cf.id = custom_field_values.field_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

drop policy if exists "custom_field_values_update" on public.custom_field_values;
create policy "custom_field_values_update" on public.custom_field_values
  for update using (
    exists (
      select 1 from public.custom_fields cf
      join public.project_members pm on pm.project_id = cf.project_id
      where cf.id = custom_field_values.field_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

drop policy if exists "custom_field_values_delete" on public.custom_field_values;
create policy "custom_field_values_delete" on public.custom_field_values
  for delete using (
    exists (
      select 1 from public.custom_fields cf
      join public.project_members pm on pm.project_id = cf.project_id
      where cf.id = custom_field_values.field_id and pm.user_id = auth.uid() and pm.role in ('owner', 'editor')
    )
  );

-- ---- notifications ----
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid());

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete using (user_id = auth.uid());

-- ---- activity_log ----
drop policy if exists "activity_log_select" on public.activity_log;
create policy "activity_log_select" on public.activity_log
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = activity_log.workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "activity_log_insert" on public.activity_log;
create policy "activity_log_insert" on public.activity_log
  for insert with check (auth.role() = 'authenticated');

-- ---- portfolios ----
drop policy if exists "portfolios_select" on public.portfolios;
create policy "portfolios_select" on public.portfolios
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = portfolios.workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "portfolios_insert" on public.portfolios;
create policy "portfolios_insert" on public.portfolios
  for insert with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = portfolios.workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "portfolios_update" on public.portfolios;
create policy "portfolios_update" on public.portfolios
  for update using (owner_id = auth.uid());

drop policy if exists "portfolios_delete" on public.portfolios;
create policy "portfolios_delete" on public.portfolios
  for delete using (owner_id = auth.uid());

-- ---- portfolio_projects ----
drop policy if exists "portfolio_projects_select" on public.portfolio_projects;
create policy "portfolio_projects_select" on public.portfolio_projects
  for select using (
    exists (
      select 1 from public.portfolios port
      join public.workspace_members wm on wm.workspace_id = port.workspace_id
      where port.id = portfolio_projects.portfolio_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "portfolio_projects_insert" on public.portfolio_projects;
create policy "portfolio_projects_insert" on public.portfolio_projects
  for insert with check (
    exists (
      select 1 from public.portfolios port
      where port.id = portfolio_projects.portfolio_id and port.owner_id = auth.uid()
    )
  );

drop policy if exists "portfolio_projects_delete" on public.portfolio_projects;
create policy "portfolio_projects_delete" on public.portfolio_projects
  for delete using (
    exists (
      select 1 from public.portfolios port
      where port.id = portfolio_projects.portfolio_id and port.owner_id = auth.uid()
    )
  );


-- ============================================================
-- 4. DATABASE FUNCTIONS
-- ============================================================

create or replace function get_my_tasks(p_user_id uuid)
returns setof tasks as $$
  select * from tasks where assignee_id = p_user_id and status != 'done' order by due_date asc nulls last;
$$ language sql stable;

create or replace function get_project_progress(p_project_id uuid)
returns json as $$
  select json_build_object(
    'total', count(*),
    'completed', count(*) filter (where status = 'done'),
    'percentage', case when count(*) > 0 then round((count(*) filter (where status = 'done'))::numeric / count(*)::numeric * 100) else 0 end
  ) from tasks where project_id = p_project_id and parent_task_id is null;
$$ language sql stable;


-- ============================================================
-- 5. ENABLE REALTIME
-- ============================================================

alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table notifications;

-- Phase 5 migrations
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
    "in_app": {
      "task_assigned": true,
      "task_commented": true,
      "mentioned": true,
      "task_completed": false,
      "due_soon": true
    },
    "email": {
      "digest_enabled": true,
      "digest_frequency": "daily",
      "task_assigned": false,
      "mentioned": false,
      "due_soon": false
    }
  }'::jsonb;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS member_limit integer DEFAULT NULL;

-- ============================================================
-- 6. WORKSPACE INVITES
-- ============================================================

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  email text,
  role text not null default 'member' check (role in ('admin', 'member', 'guest')),
  token uuid not null default gen_random_uuid(),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists idx_workspace_invites_token on public.workspace_invites(token);
create index if not exists idx_workspace_invites_workspace on public.workspace_invites(workspace_id);

-- RLS policies for workspace_invites
alter table public.workspace_invites enable row level security;

create policy "Workspace members can view invites"
  on public.workspace_invites for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  );

create policy "Workspace admins and owners can create invites"
  on public.workspace_invites for insert
  with check (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Workspace admins and owners can update invites"
  on public.workspace_invites for update
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Anyone can read invite by token"
  on public.workspace_invites for select
  using (true);

-- Add is_favorite column to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- =============================================================================
-- RBAC: Migrate workspace_members roles from (owner/admin/member/guest)
-- to 3-tier system (owner/admin/employee/client)
-- =============================================================================

-- Migrate existing data: member → employee, guest → client
UPDATE public.workspace_members SET role = 'employee' WHERE role = 'member';
UPDATE public.workspace_members SET role = 'client' WHERE role = 'guest';

-- Update the check constraint
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'admin', 'employee', 'client'));

-- Update workspace_invites role constraint similarly
ALTER TABLE public.workspace_invites DROP CONSTRAINT IF EXISTS workspace_invites_role_check;
ALTER TABLE public.workspace_invites
  ADD CONSTRAINT workspace_invites_role_check
  CHECK (role IN ('admin', 'employee', 'client'));

-- Add comment visibility column: 'all' (visible to everyone) or 'internal' (employees/admins only)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'all'
  CHECK (visibility IN ('all', 'internal'));
