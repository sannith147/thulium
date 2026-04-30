import React, { useState } from "react";
import { Card } from "../Card";
import { Search, Filter, MessageSquare, ChevronRight } from "lucide-react";

export function StudentTable({ students, onSelectStudent, onBroadcast }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = students?.filter(s => 
    s.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Card title="Student Population" className="overflow-hidden">
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-slate-900/50 py-2 pl-10 pr-4 text-sm outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
          />
        </div>
        <button className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700">
          <Filter className="h-4 w-4" />
          Filters
        </button>
        <button 
          onClick={onBroadcast}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <MessageSquare className="h-4 w-4" />
          Broadcast
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Accuracy</th>
              <th className="px-4 py-3 font-medium">XP</th>
              <th className="px-4 py-3 font-medium">Tests</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredStudents.map((student, idx) => (
              <tr key={student.student_id || `student-${idx}`} className="group hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-100">{student.student_name}</div>
                  <div className="text-xs text-slate-500">ID: {student.student_id?.slice(0, 8)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                      <div 
                        className={`h-full rounded-full ${Number(student.accuracy) >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${student.accuracy}%` }}
                      />
                    </div>
                    <span>{student.accuracy}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-indigo-400">{student.xp}</td>
                <td className="px-4 py-3">{student.tests_completed}</td>
                <td className="px-4 py-3 text-right">
                  <button 
                    onClick={() => onSelectStudent(student)}
                    className="flex items-center gap-1 rounded bg-slate-800 p-1.5 text-slate-400 transition-colors hover:bg-indigo-600 hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan="5" className="py-10 text-center text-slate-500">
                  No students found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
