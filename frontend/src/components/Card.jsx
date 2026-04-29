export function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-slate-100">{title}</h3>
      {children}
    </section>
  );
}
