import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="text-5xl mb-4">🔍</div>
      <h2 className="text-2xl font-bold text-thermax-navy mb-2">Page Not Found</h2>
      <p className="text-thermax-slate mb-6 max-w-md">
        The page you are looking for does not exist in the Thermax Agentic AI Operating System.
      </p>
      <Link
        href="/"
        className="bg-thermax-saffron text-white font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-saffronDeep transition"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
