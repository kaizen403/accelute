import Link from "next/link";

interface AppShellProps {
  children: React.ReactNode;
  activeNav?: "runs" | "suites";
}

const navItems = [
  { id: "runs" as const, label: "Runs", href: "/" },
  { id: "suites" as const, label: "Suites", href: "/suites" },
];

export function AppShell({ children, activeNav = "runs" }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-glass-border bg-base/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-text-primary transition-colors duration-150 hover:text-white"
          >
            Accelute QA
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors duration-150 ${
                    isActive
                      ? "bg-white/[0.08] text-text-primary"
                      : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
