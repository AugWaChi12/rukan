import { ApiStatus } from '@/components/api-status';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">stuMatch</h1>
      <ApiStatus />
    </main>
  );
}
