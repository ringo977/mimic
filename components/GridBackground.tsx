'use client';

export default function GridBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(224, 220, 220, 0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(224, 220, 220, 0.08) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
      }}
      aria-hidden="true"
    />
  );
}
