# GATE Prep Platform

Full-stack starter app for GATE preparation with Student and Evaluator roles.

## Tech Stack
- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Database/Auth/Realtime: Supabase

## Project Structure
- `frontend/` React app for student/evaluator UI
- `backend/` REST APIs
- `supabase/schema.sql` database schema and policies

## Setup
1. Create Supabase project and run `supabase/schema.sql` in SQL editor.
2. Copy env files:
   - `frontend/.env.example` to `.env`
   - `backend/.env.example` to `.env`
3. Install dependencies:
   - `cd backend && npm install`
   - `cd frontend && npm install`
4. Run servers:
   - `cd backend && npm run dev`
   - `cd frontend && npm run dev`

## Core Modules
- Student dashboard: tasks, streak, XP, performance
- Leaderboard: XP + test weighted ranking
- Exams: daily/weekly attempts and scoring
- Evaluator panel: content/test management + analytics
