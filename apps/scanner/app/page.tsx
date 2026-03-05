import Link from 'next/link';

export default function ScannerHome() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold">Yo Te Invito — Scanner</h1>
      <Link
        href="/door"
        className="mt-6 rounded-lg bg-emerald-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-emerald-500"
      >
        Ir a Door Mode
      </Link>
    </main>
  );
}
