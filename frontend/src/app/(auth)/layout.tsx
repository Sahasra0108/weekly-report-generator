export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-base font-bold text-white shadow-sm">
            W
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Weekly Reports
          </h1>
          <p className="mt-1 text-sm text-muted">
            Submit weekly updates and track your team
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}