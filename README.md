# TaskFlow

A production-grade, multi-user task management platform built with React, TypeScript, and Supabase. Features Asana-like task management with multiple views, real-time collaboration, and team workspace management.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS v4 + custom design system
- **State:** Zustand (global) + React Query (server state)
- **Backend/DB:** Supabase (Postgres + Realtime + Auth + Storage)
- **Routing:** React Router v6
- **Drag & Drop:** @dnd-kit/core + @dnd-kit/sortable
- **Icons:** Lucide React

## Features

- Email/password & magic link authentication
- Multi-workspace support with role-based access
- Project management with 4 views: List, Board (Kanban), Timeline (Gantt), Calendar
- Task detail panel with subtasks, comments, attachments, activity log
- Real-time collaboration via Supabase Realtime
- Command palette (Cmd+K) for global search
- Dark mode support
- Notification inbox with real-time updates
- Portfolio overview
- Keyboard shortcuts

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd taskflow
npm install
```

### 2. Configure environment

Create a `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run database migrations

Open your Supabase project's SQL Editor and run the contents of `supabase-migrations.sql`. This creates all tables, RLS policies, database functions, and enables realtime.

### 4. Create storage bucket

In your Supabase dashboard, go to Storage and create a public bucket called `attachments`.

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:5173

## Project Structure

```
src/
├── components/
│   ├── layout/        # AppShell, Sidebar, TopBar
│   ├── tasks/         # TaskRow, TaskCard, TaskDetailPanel, etc.
│   ├── projects/      # ProjectHeader, ProjectCard
│   ├── views/         # ListView, BoardView, TimelineView, CalendarView
│   └── dashboard/     # CommandPalette
├── pages/             # Route pages (Home, Project, Inbox, etc.)
├── stores/            # Zustand stores
├── hooks/             # React Query hooks, Auth, Realtime
├── lib/               # Supabase client, utils
└── types/             # TypeScript interfaces
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Cmd+K | Open command palette |
| Cmd+\\ | Toggle sidebar |
| Esc | Close panel / cancel |
