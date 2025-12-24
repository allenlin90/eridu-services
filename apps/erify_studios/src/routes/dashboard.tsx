import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Studio Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome to Erify Studios.</p>
    </div>
  );
}
