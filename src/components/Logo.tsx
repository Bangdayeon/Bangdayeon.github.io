export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M15.9 3.5c3.4 1 5.3 4.3 4.4 7.6-.5 2-1.8 3.5-2.5 5.4-.9 2.3-2.6 4.1-5.2 4.2-3.3.2-6.6-1.8-8-4.9-1.3-3-.8-6.7 1.4-9.1C8.2 4.3 12.3 2.4 15.9 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="9.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="13" r="1" fill="currentColor" />
      <circle cx="9.5" cy="14.5" r="0.75" fill="currentColor" />
    </svg>
  );
}
