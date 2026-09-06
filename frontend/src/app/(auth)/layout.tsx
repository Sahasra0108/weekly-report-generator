export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Weekly Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Submit weekly updates and track your team
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}