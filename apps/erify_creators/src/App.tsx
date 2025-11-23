import { Button } from '@eridu/ui';
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h1 className="text-3xl font-bold text-primary">Erify Creators</h1>
      <div className="flex gap-4">
        <Button onClick={() => setCount(count + 1)}>Count is {count}</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </div>
  );
}

export default App;
