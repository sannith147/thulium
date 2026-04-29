-- Enable extension for UUID generation
create extension if not exists pgcrypto;

-- Roles and profiles
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('student', 'evaluator')),
  created_at timestamptz default now()
);

create table if not exists students (
  id uuid primary key references users(id) on delete cascade,
  streak_days int default 0,
  xp int default 0,
  last_active_date date,
  created_at timestamptz default now()
);

create table if not exists evaluators (
  id uuid primary key references users(id) on delete cascade,
  specialization text,
  created_at timestamptz default now()
);

-- Evaluator managed learning content
create table if not exists learning_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content_type text not null check (content_type in ('video', 'assignment', 'reading', 'video_assignment')),
  youtube_url text,
  file_url text,
  assignment_payload jsonb,
  created_by uuid not null references evaluators(id),
  created_at timestamptz default now()
);

create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  video_url text not null,
  assignment_id uuid references learning_content(id),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz default now()
);

-- Exams
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  exam_type text not null check (exam_type in ('daily', 'weekly')),
  duration_minutes int not null,
  scheduled_at timestamptz not null,
  questions jsonb,
  file_url text,
  created_by uuid not null references evaluators(id),
  created_at timestamptz default now()
);

create table if not exists exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  responses jsonb not null,
  score numeric(5,2) not null,
  accuracy numeric(5,2) not null,
  submitted_at timestamptz default now(),
  unique (exam_id, student_id)
);

-- Chat
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  evaluator_id uuid not null references evaluators(id) on delete cascade,
  sender_role text not null check (sender_role in ('student', 'evaluator')),
  message text not null,
  created_at timestamptz default now()
);

-- Notifications
create table if not exists student_notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  evaluator_id uuid references evaluators(id) on delete set null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_student_notifications_student_id on student_notifications(student_id);

-- ---------------------------------------------
-- Leaderboard module (XP, streaks, subjects, badges, anti-cheat)
-- ---------------------------------------------

-- Track logins/sessions (for activity + consistency)
create table if not exists student_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int generated always as (
    case when ended_at is null then null else greatest(0, floor(extract(epoch from (ended_at - started_at)))::int) end
  ) stored,
  created_at timestamptz default now()
);

create index if not exists idx_student_sessions_student_started on student_sessions(student_id, started_at desc);

-- XP event ledger (primary ranking system)
create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'video_watch',
      'videos_both_completed_bonus',
      'questions_solved',
      'full_daily_completion_bonus',
      'accuracy_bonus',
      'streak_bonus',
      'manual_adjustment'
    )
  ),
  xp int not null check (xp >= 0),
  metadata jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index if not exists idx_xp_events_student_occurred on xp_events(student_id, occurred_at desc);
create index if not exists idx_xp_events_occurred on xp_events(occurred_at desc);

-- Daily completion summary (supports completed tasks % and daily targets)
create table if not exists student_daily_summary (
  student_id uuid not null references students(id) on delete cascade,
  day date not null,
  videos_completed int not null default 0 check (videos_completed between 0 and 2),
  questions_attempted int not null default 0,
  questions_correct int not null default 0,
  full_completion boolean not null default false,
  completed_tasks_percent numeric(5,2) not null default 0,
  xp_earned int not null default 0,
  updated_at timestamptz default now(),
  primary key (student_id, day)
);

create index if not exists idx_student_daily_summary_day on student_daily_summary(day desc);

-- Subjects + subject-wise attempts (for subject leaderboards)
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  created_at timestamptz default now()
);

create table if not exists student_subject_stats (
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  attempts int not null default 0,
  correct int not null default 0,
  incorrect int not null default 0,
  accuracy numeric(5,2) not null default 0,
  subject_score numeric(10,2) not null default 0,
  updated_at timestamptz default now(),
  primary key (student_id, subject_id)
);

create index if not exists idx_student_subject_stats_subject_score on student_subject_stats(subject_id, subject_score desc);

-- Rank snapshots for movement indicators (up/down/no change)
create table if not exists leaderboard_rank_snapshots (
  id uuid primary key default gen_random_uuid(),
  time_window text not null check (time_window in ('daily', 'weekly', 'monthly', 'all_time')),
  metric text not null check (metric in ('xp', 'accuracy', 'streak', 'subject')),
  subject_id uuid references subjects(id) on delete cascade,
  snapshot_date date not null,
  student_id uuid not null references students(id) on delete cascade,
  rank int not null,
  value numeric(12,2) not null,
  created_at timestamptz default now(),
  unique (time_window, metric, subject_id, snapshot_date, student_id)
);

create index if not exists idx_rank_snapshots_lookup on leaderboard_rank_snapshots(time_window, metric, subject_id, snapshot_date desc, rank);

-- Badges (metadata + assignments)
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  icon text,
  created_at timestamptz default now()
);

create table if not exists student_badges (
  student_id uuid not null references students(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  awarded_at timestamptz default now(),
  metadata jsonb,
  primary key (student_id, badge_id)
);

-- Anti-cheat / suspicious behavior flags
create table if not exists student_flags (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  flag_type text not null check (flag_type in ('abnormal_accuracy', 'too_fast_answers', 'suspicious_activity')),
  severity int not null default 1 check (severity between 1 and 5),
  details jsonb,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index if not exists idx_student_flags_student_created on student_flags(student_id, created_at desc);

-- In-app alerts (drop alerts, warnings, etc.)
create table if not exists student_alerts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  alert_type text not null check (alert_type in ('rank_drop', 'streak_risk', 'flag_warning')),
  title text not null,
  message text not null,
  severity int not null default 1 check (severity between 1 and 5),
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists idx_student_alerts_student_created on student_alerts(student_id, created_at desc);

-- ---------------------------------------------
-- Views for dashboard, leaderboard, analytics
-- ---------------------------------------------
drop view if exists student_performance_summary cascade;
create or replace view student_performance_summary as
select
  s.id as student_id,
  coalesce(avg(a.accuracy), 0)::numeric(5,2) as accuracy,
  count(a.id)::int as tests_completed,
  coalesce(avg(a.score), 0)::numeric(5,2) as avg_score,
  s.xp
from students s
left join exam_attempts a on a.student_id = s.id
group by s.id;

drop view if exists student_analytics_view cascade;
create or replace view student_analytics_view as
select
  s.id                                                  as student_id,
  u.full_name                                           as student_name,
  u.email                                               as mss_id,
  s.xp,
  s.streak_days,
  s.last_active_date,
  coalesce(avg(a.accuracy), 0)::numeric(5,2)           as accuracy,
  count(a.id)::int                                      as tests_completed,
  max(a.submitted_at)                                   as last_activity,
  coalesce(
    (select count(distinct d.day)
     from student_daily_summary d
     where d.student_id = s.id), 0
  )::int                                                as activity_days
from students s
join users u on s.id = u.id
left join exam_attempts a on a.student_id = s.id
group by s.id, u.full_name, u.email, s.xp, s.streak_days, s.last_active_date;

drop view if exists leaderboard_view cascade;
create or replace view leaderboard_view as
select
  row_number() over (order by (s.xp * 0.6 + coalesce(avg(a.score), 0) * 0.4) desc) as rank,
  s.id as student_id,
  u.full_name as student_name,
  s.xp,
  coalesce(avg(a.score), 0)::numeric(5,2) as avg_score,
  (s.xp * 0.6 + coalesce(avg(a.score), 0) * 0.4)::numeric(8,2) as leaderboard_points
from students s
join users u on u.id = s.id
left join exam_attempts a on a.student_id = s.id
group by s.id, u.full_name;

-- New global leaderboard view (activity + consistency + performance)
create or replace view leaderboard_global_all_time as
select
  s.id as student_id,
  u.full_name as student_name,
  s.xp as xp_total,
  s.streak_days as streak_days,
  s.last_active_date,
  coalesce(ps.accuracy, 0)::numeric(5,2) as accuracy,
  coalesce((
    select avg(d.completed_tasks_percent)
    from student_daily_summary d
    where d.student_id = s.id and d.day >= (current_date - interval '30 days')::date
  ), 0)::numeric(5,2) as completed_tasks_percent_30d
from students s
join users u on u.id = s.id
left join student_performance_summary ps on ps.student_id = s.id;

-- Windowed XP (daily/weekly/monthly) for time-based leaderboards
create or replace view leaderboard_xp_windows as
select
  s.id as student_id,
  u.full_name as student_name,
  s.streak_days,
  s.last_active_date,
  coalesce(ps.accuracy, 0)::numeric(5,2) as accuracy,
  coalesce(sum(case when e.occurred_at >= now() - interval '1 day' then e.xp else 0 end), 0)::int as xp_daily,
  coalesce(sum(case when e.occurred_at >= now() - interval '7 days' then e.xp else 0 end), 0)::int as xp_weekly,
  coalesce(sum(case when e.occurred_at >= now() - interval '30 days' then e.xp else 0 end), 0)::int as xp_monthly,
  coalesce(sum(e.xp), 0)::int as xp_all_time
from students s
join users u on u.id = s.id
left join xp_events e on e.student_id = s.id
left join student_performance_summary ps on ps.student_id = s.id
group by s.id, u.full_name, s.streak_days, s.last_active_date, ps.accuracy;

-- Accuracy leaderboard base (attempt count + ratio)
create or replace view leaderboard_accuracy_all_time as
select
  s.id as student_id,
  u.full_name as student_name,
  s.xp as xp_total,
  s.streak_days,
  s.last_active_date,
  count(a.id)::int as attempt_count,
  coalesce(avg(a.accuracy), 0)::numeric(5,2) as accuracy
from students s
join users u on u.id = s.id
left join exam_attempts a on a.student_id = s.id
group by s.id, u.full_name, s.xp, s.streak_days, s.last_active_date;

-- Streak leaderboard base (consistency = active days / window)
create or replace view leaderboard_streak_all_time as
select
  s.id as student_id,
  u.full_name as student_name,
  s.streak_days,
  s.last_active_date,
  coalesce((
    select count(*)::int
    from student_daily_summary d
    where d.student_id = s.id and d.day >= (current_date - interval '30 days')::date
  ), 0) as activity_days_30d,
  (coalesce((
    select count(*)::numeric
    from student_daily_summary d
    where d.student_id = s.id and d.day >= (current_date - interval '30 days')::date
  ), 0) / 30.0 * 100.0)::numeric(5,2) as consistency_percent_30d
from students s
join users u on u.id = s.id;

-- Subject-wise leaderboard base
create or replace view leaderboard_subject_all_time as
select
  ss.subject_id,
  subj.name as subject_name,
  ss.student_id,
  u.full_name as student_name,
  ss.subject_score,
  ss.accuracy,
  ss.attempts
from student_subject_stats ss
join students s on s.id = ss.student_id
join users u on u.id = s.id
join subjects subj on subj.id = ss.subject_id;

-- RPC: fetch leaderboard with pagination + movement (requires snapshots to be populated by a scheduled job)
create or replace function get_leaderboard(
  p_type text,
  p_window text,
  p_sort text,
  p_subject_id uuid,
  p_limit int,
  p_offset int
)
returns table (
  rank int,
  student_id uuid,
  student_name text,
  xp int,
  accuracy numeric,
  streak_days int,
  completed_tasks_percent numeric,
  attempt_count int,
  last_active_date date,
  movement int
)
language sql
stable
as $$
with base as (
  select
    g.student_id,
    g.student_name,
    -- choose XP based on window (or all-time)
    case
      when p_window = 'daily' then w.xp_daily
      when p_window = 'weekly' then w.xp_weekly
      when p_window = 'monthly' then w.xp_monthly
      else w.xp_all_time
    end as xp,
    g.accuracy,
    g.streak_days,
    g.completed_tasks_percent_30d as completed_tasks_percent,
    a.attempt_count,
    g.last_active_date
  from leaderboard_global_all_time g
  join leaderboard_xp_windows w on w.student_id = g.student_id
  left join leaderboard_accuracy_all_time a on a.student_id = g.student_id
  where
    (p_type <> 'subject' or exists (
      select 1 from leaderboard_subject_all_time s
      where s.student_id = g.student_id and s.subject_id = p_subject_id
    ))
),
ranked as (
  select
    row_number() over (
      order by
        case when p_sort = 'accuracy' then base.accuracy end desc nulls last,
        case when p_sort = 'streak' then base.streak_days end desc nulls last,
        case when p_sort = 'xp' or p_sort is null then base.xp end desc nulls last,
        base.student_name asc
    )::int as rank,
    base.*
  from base
)
select
  r.rank,
  r.student_id,
  r.student_name,
  r.xp,
  r.accuracy,
  r.streak_days,
  r.completed_tasks_percent,
  r.attempt_count,
  r.last_active_date,
  case
    when snap.rank is null then 0
    when snap.rank > r.rank then 1
    when snap.rank < r.rank then -1
    else 0
  end as movement
from ranked r
left join lateral (
  select rs.rank
  from leaderboard_rank_snapshots rs
  where rs.student_id = r.student_id
    and rs.time_window = case when p_window in ('daily','weekly','monthly') then p_window else 'all_time' end
    and rs.metric = case when p_type in ('accuracy','streak') then p_type else 'xp' end
    and (p_type <> 'subject' or rs.subject_id = p_subject_id)
  order by rs.snapshot_date desc
  limit 1
) snap on true
order by r.rank
limit greatest(1, least(p_limit, 200))
offset greatest(0, p_offset);
$$;

-- RPC: nearby ranks (5 above, self, 5 below)
create or replace function get_leaderboard_nearby(
  p_student_id uuid,
  p_type text,
  p_window text,
  p_sort text,
  p_subject_id uuid
)
returns table (
  rank int,
  student_id uuid,
  student_name text,
  xp int,
  accuracy numeric,
  streak_days int,
  completed_tasks_percent numeric,
  movement int
)
language sql
stable
as $$
with full_board as (
  select * from get_leaderboard(p_type, p_window, p_sort, p_subject_id, 200, 0)
),
me as (
  select rank as my_rank from full_board where student_id = p_student_id
)
select
  fb.rank,
  fb.student_id,
  fb.student_name,
  fb.xp,
  fb.accuracy,
  fb.streak_days,
  fb.completed_tasks_percent,
  fb.movement
from full_board fb, me
where fb.rank between greatest(1, me.my_rank - 5) and (me.my_rank + 5)
order by fb.rank;
$$;

-- Duplicate view removed

-- Basic RLS setup
alter table users enable row level security;
alter table students enable row level security;
alter table evaluators enable row level security;
alter table learning_content enable row level security;
alter table daily_tasks enable row level security;
alter table exams enable row level security;
alter table exam_attempts enable row level security;
alter table chat_messages enable row level security;
alter table student_sessions enable row level security;
alter table xp_events enable row level security;
alter table student_daily_summary enable row level security;
alter table subjects enable row level security;
alter table student_subject_stats enable row level security;
alter table leaderboard_rank_snapshots enable row level security;
alter table badges enable row level security;
alter table student_badges enable row level security;
alter table student_flags enable row level security;
alter table student_alerts enable row level security;
alter table student_notifications enable row level security;

-- Example policies (adjust to your auth model)
drop policy if exists "students can read own data" on students;
create policy "students can read own data" on students
for select using (auth.uid() = id);

drop policy if exists "evaluators can manage content" on learning_content;
create policy "evaluators can manage content" on learning_content
for all using (auth.uid() = created_by)
with check (auth.uid() = created_by);

-- Minimal policies for leaderboard reads (refine for production)
drop policy if exists "students can read public leaderboard" on users;
create policy "students can read public leaderboard" on users
for select using (role = 'student');

-- Missing RPCs for Evaluator Dashboard
create or replace function get_engagement_heatmap()
returns table (day date, activity_count int)
language sql
stable
as $$
  select
    day,
    sum(videos_completed + (case when questions_attempted > 0 then 1 else 0 end))::int as activity_count
  from student_daily_summary
  where day >= current_date - interval '30 days'
  group by day
  order by day;
$$;

create or replace function get_student_segmentation_counts()
returns table (segment text, student_count int)
language sql
stable
as $$
  with stats as (
    select
      s.student_id,
      s.accuracy,
      st.xp,
      (select count(*) from student_daily_summary d where d.student_id = s.student_id and d.day >= current_date - interval '7 days') as active_days_7d
    from student_performance_summary s
    join students st on st.id = s.student_id
  )
  select 'Top Performers' as segment, count(*)::int as student_count from stats where accuracy >= 85 and xp >= 1000
  union all
  select 'Needs Conceptual Help' as segment, count(*)::int as student_count from stats where accuracy < 50 and active_days_7d >= 3
  union all
  select 'Inconsistent' as segment, count(*)::int as student_count from stats where active_days_7d < 2 and active_days_7d > 0
  union all
  select 'At Risk' as segment, count(*)::int as student_count from stats where active_days_7d = 0;
$$;

-- Seed Data
insert into users (email, full_name, role) values
('MSS2023104', 'SANNITH', 'evaluator'),
('MSS2023115', 'SRAVANI', 'evaluator'),
('MSS2023126', 'SRIKANTH', 'evaluator'),
('MSS2023145', 'VARSHA', 'evaluator'),
('MSS2022136', 'VIVEKANANDA', 'evaluator'),
('MSS2023112', 'SHIVAPRIYA', 'evaluator'),
('MSS2023056', 'MAHESH', 'evaluator'),
('MSS2023019', 'CHANDANA', 'evaluator'),
('MSS2023006', 'Akshay', 'evaluator'),
('MSS2023153', 'Vishnu', 'evaluator'),
('MSS-DEMO-001', 'Demo Student', 'student')
on conflict (email) do update set full_name = excluded.full_name, role = excluded.role;

insert into evaluators (id, specialization)
select id, 'DE' from users where email = 'MSS2023104'
union all select id, 'TOC' from users where email = 'MSS2023115'
union all select id, 'DS' from users where email = 'MSS2023126'
union all select id, 'CN' from users where email = 'MSS2023145'
union all select id, 'DBMS' from users where email = 'MSS2022136'
union all select id, 'CO' from users where email = 'MSS2023112'
union all select id, 'OS' from users where email = 'MSS2023056'
union all select id, 'CD' from users where email = 'MSS2023019'
union all select id, 'General' from users where email = 'MSS2023006'
union all select id, 'General' from users where email = 'MSS2023153'
on conflict (id) do update set specialization = excluded.specialization;


insert into students (id, xp, streak_days)
select id, 1200, 5 from users where email = 'MSS-DEMO-001'
on conflict (id) do update set xp = excluded.xp;

insert into subjects (slug, name) values
('de', 'DE'),
('toc', 'TOC'),
('ds', 'DS'),
('cn', 'CN'),
('dbms', 'DBMS'),
('co', 'CO'),
('os', 'OS'),
('cd', 'CD')
on conflict (slug) do nothing;

insert into learning_content (title, content_type, created_by)
select 'Intro to Linked Lists', 'video', id from users where email = 'MSS2023104'
union all
select 'Sorting Algorithms Deep Dive', 'video', id from users where email = 'MSS2023115'
on conflict do nothing;

insert into exams (title, exam_type, duration_minutes, scheduled_at, questions, created_by)
select 'Daily Quiz - Lists', 'daily', 15, now(), '[]'::jsonb, id from users where email = 'MSS2023104'
union all
select 'Weekly Mock #1', 'weekly', 60, now() + interval '1 day', '[]'::jsonb, id from users where email = 'MSS2023115'
on conflict do nothing;

insert into student_daily_summary (student_id, day, videos_completed, questions_attempted, questions_correct, full_completion, completed_tasks_percent, xp_earned)
select id, current_date, 1, 5, 4, false, 50, 50 from users where email = 'MSS-DEMO-001'
union all
select id, current_date - interval '1 day', 2, 10, 9, true, 100, 150 from users where email = 'MSS-DEMO-001'
on conflict (student_id, day) do nothing;
