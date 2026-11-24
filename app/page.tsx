import { Counter } from "@/components/counter";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16">
      <h1 className="text-2xl font-bold">WebStarter</h1>
      <Counter />
    </main>
  );
}
