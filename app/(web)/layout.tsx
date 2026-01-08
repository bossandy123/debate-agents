/**
 * Web Application Layout
 * Apple-style minimalist layout with subtle tech effects
 */

export default function WebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Tech Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="tech-grid" />

        {/* Tech particles */}
        <div className="tech-particles">
          <div className="particle-1" />
          <div className="particle-2" />
          <div className="particle-3" />
          <div className="particle-4" />
        </div>

        {/* Ambient gradient - very subtle */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-10 dark:opacity-5"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
