import { Link } from "react-router-dom";

export function RoleSelectionPage() {
  return (
    <div className="mx-auto mt-16 max-w-xl rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
      <h1 className="text-2xl font-semibold">Welcome to GATE Prep</h1>
      <p className="mt-2 text-slate-300">Please choose your role to continue.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link to="/login/student" className="rounded-lg bg-indigo-600 px-4 py-3 font-medium hover:bg-indigo-500">
          I am a Student
        </Link>
        <Link to="/login/evaluator" className="rounded-lg bg-emerald-600 px-4 py-3 font-medium hover:bg-emerald-500">
          I am an Evaluator
        </Link>
      </div>
    </div>
  );
}
