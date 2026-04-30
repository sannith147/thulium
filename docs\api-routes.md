# API Routes

## Student
- `GET /api/student/dashboard/:studentId`
  - Returns daily tasks, streak, xp, and performance summary.
- `GET /api/student/leaderboard`
  - Returns ranked leaderboard by weighted points (XP + score).
- `GET /api/student/exams/:studentId`
  - Returns daily and weekly exams assigned/available.
- `POST /api/student/exams/:examId/submit`
  - Body: `{ studentId, responses: { answers, score, accuracy } }`
  - Stores exam attempt and accuracy.

## Evaluator
- `POST /api/evaluator/content`
  - Body: `{ title, content_type, youtube_url, assignment_payload, created_by }`
  - Add videos/links/assignments.
- `POST /api/evaluator/exams`
  - Body: `{ title, exam_type, duration_minutes, scheduled_at, questions, created_by }`
  - Create daily/weekly tests.
- `GET /api/evaluator/analytics/:studentId`
  - Returns accuracy, activity, tests completed, XP.

## Realtime Chat
- Socket event `join_room` with `{ studentId, evaluatorId }`
- Socket event `send_message` with `{ student_id, evaluator_id, sender_role, message }`
- Socket event `receive_message` emitted to both student and evaluator
