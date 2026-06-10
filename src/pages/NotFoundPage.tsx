import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-8 text-slate-950">
      <section className="w-full max-w-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <Link
          className="mt-6 inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-100"
          to="/"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
