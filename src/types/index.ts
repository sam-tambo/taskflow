export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
}

export type WorkspaceRole = 'owner' | 'admin' | 'employee' | 'client';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  profiles?: Profile;
}

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  profiles?: Profile;
}

export interface Project {
  id: string;
  workspace_id: string;
  team_id: string | null;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  status: 'active' | 'archived' | 'completed';
  privacy: 'workspace' | 'team' | 'private';
  default_view: 'list' | 'board' | 'timeline' | 'calendar';
  start_date: string | null;
  due_date: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  sections?: Section[];
  owner?: Profile;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  profiles?: Profile;
}

export interface Section {
  id: string;
  project_id: string;
  name: string;
  position: number;
  color: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  project_id: string | null;
  section_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  created_by: string | null;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  position: number;
  is_milestone: boolean;
  is_favorite: boolean;
  estimated_hours: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  assignee?: Profile;
  section?: Section;
  project?: Project;
  subtasks?: Task[];
  comments_count?: number;
  attachments_count?: number;
  subtasks_count?: number;
  subtasks_completed?: number;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_id: string;
  dependency_type: string;
  depends_on?: Task;
  task?: Task;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  is_edited: boolean;
  visibility: 'all' | 'internal';
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface Attachment {
  id: string;
  task_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
  uploader?: Profile;
}

export interface CustomField {
  id: string;
  project_id: string;
  name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'checkbox';
  options: { label: string; color: string }[] | null;
  position: number;
}

export interface CustomFieldValue {
  id: string;
  task_id: string;
  field_id: string;
  value: string | null;
  field?: CustomField;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: 'task_assigned' | 'task_commented' | 'task_completed' | 'mentioned' | 'due_soon';
  title: string;
  body: string | null;
  resource_type: 'task' | 'project' | 'comment' | null;
  resource_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string | null;
  task_id: string;
  project_id: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user?: Profile;
}

export interface Portfolio {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  projects?: Project[];
}

export interface Goal {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: 'on_track' | 'at_risk' | 'missed' | 'completed';
  due_date: string | null;
  current_value: number;
  target_value: number;
  unit: string;
  color: string;
  created_at: string;
  updated_at: string;
  owner?: Profile | null;
  projects?: Project[];
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'email' | 'select' | 'date' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  options: string[];
  maps_to: 'title' | 'description' | 'due_date' | 'priority' | 'assignee' | 'tag' | null;
}

export interface ProjectForm {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  slug: string;
  fields: FormField[];
  submit_button_text: string;
  success_message: string;
  target_section_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  task_id: string | null;
  submitted_data: Record<string, any>;
  submitter_email: string | null;
  submitted_at: string;
}

export interface AutomationRule {
  id: string;
  workspace_id: string;
  project_id: string | null;
  name: string;
  is_active: boolean;
  trigger_type: string;
  trigger_config: Record<string, any>;
  condition_config: Record<string, any> | null;
  action_type: string;
  action_config: Record<string, any>;
  run_count: number;
  last_run_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
