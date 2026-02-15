# Frontend Performance - Code Examples

This file contains detailed performance optimization examples extracted from the main SKILL.md.

## Code Splitting Examples

### Route-level Code Splitting (TanStack Router)

```typescript
// Routes are automatically code-split by TanStack Router
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/studios/$studioId/tasks')({
  component: TasksPage,  // Automatically lazy-loaded
});

function TasksPage() {
  return <div>Tasks Page</div>;
}
```

### Component-level Lazy Loading

```typescript
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@eridu/ui';

// Lazy load heavy components
const TaskTemplateBuilder = lazy(() => import('./task-template-builder'));
const ChartDashboard = lazy(() => import('./chart-dashboard'));
const RichTextEditor = lazy(() => import('./rich-text-editor'));

export function TaskTemplatePage() {
  return (
    <div>
      <h1>Task Template</h1>
      
      <Suspense fallback={<LoadingSpinner />}>
        <TaskTemplateBuilder />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-muted animate-pulse" />}>
        <ChartDashboard />
      </Suspense>
    </div>
  );
}
```

### Dynamic Imports

```typescript
import { useState } from 'react';

export function TaskActions() {
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleExport = async () => {
    // Only load export dialog when needed
    const { ExportDialog } = await import('./export-dialog');
    setShowExportDialog(true);
  };

  return (
    <div>
      <button onClick={handleExport}>Export</button>
      {showExportDialog && <ExportDialog />}
    </div>
  );
}
```

---

## Memoization Examples

### useMemo for Expensive Computations

```typescript
import { useMemo } from 'react';

export function TaskList({ tasks }: { tasks: Task[] }) {
  // ✅ GOOD: Memoize expensive sorting/filtering
  const sortedAndFilteredTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status !== 'archived')
      .sort((a, b) => {
        // Complex sorting logic
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      });
  }, [tasks]);

  return (
    <div>
      {sortedAndFilteredTasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
```

```typescript
// ❌ BAD: Expensive computation on every render
export function TaskList({ tasks }: { tasks: Task[] }) {
  const sortedTasks = tasks.sort(...);  // Runs on every render!
  return <div>{sortedTasks.map(...)}</div>;
}
```

### useCallback for Stable Function References

```typescript
import { useCallback } from 'react';

export function TaskList({ tasks }: { tasks: Task[] }) {
  // ✅ GOOD: Memoize callback when passing to memoized children
  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
  }, []);  // No dependencies = stable reference

  return (
    <div>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onUpdate={handleTaskUpdate}  // Stable reference prevents re-renders
        />
      ))}
    </div>
  );
}
```

### React.memo for Component Memoization

```typescript
import { memo } from 'react';

type TaskCardProps = {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
};

// ✅ GOOD: Memoize expensive list items
export const TaskCard = memo(({ task, onUpdate }: TaskCardProps) => {
  return (
    <div className="task-card">
      <h3>{task.name}</h3>
      <p>{task.description}</p>
      <button onClick={() => onUpdate(task.id, { status: 'completed' })}>
        Complete
      </button>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';
```

```typescript
// Custom comparison function for complex props
export const TaskCard = memo(
  ({ task, onUpdate }: TaskCardProps) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Only re-render if task.id or task.updatedAt changed
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.updatedAt === nextProps.task.updatedAt
    );
  }
);
```

---

## Virtual Scrolling Examples

### Basic Virtual List with @tanstack/react-virtual

```typescript
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualTaskList({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,  // Estimated height of each item
    overscan: 5,  // Render 5 extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <TaskCard task={tasks[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Variable Size Virtual List

```typescript
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export function VariableSizeTaskList({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      // Dynamic sizing based on content
      const task = tasks[index];
      if (task.description && task.description.length > 100) {
        return 150;  // Taller for tasks with long descriptions
      }
      return 80;  // Default height
    },
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const task = tasks[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}  // Measure actual size
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <TaskCard task={task} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Image Optimization Examples

### Native Lazy Loading

```tsx
export function TaskAttachment({ url, alt }: { url: string; alt: string }) {
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"  // ✅ Native lazy loading
      className="w-full h-auto"
    />
  );
}
```

### Responsive Images

```tsx
export function TaskThumbnail({ imageId, alt }: { imageId: string; alt: string }) {
  const baseUrl = `/api/images/${imageId}`;

  return (
    <img
      srcSet={`
        ${baseUrl}?size=small 400w,
        ${baseUrl}?size=medium 800w,
        ${baseUrl}?size=large 1200w
      `}
      sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
      src={`${baseUrl}?size=medium`}
      alt={alt}
      loading="lazy"
      className="w-full h-auto"
    />
  );
}
```

### Image Placeholder with Blur

```tsx
import { useState } from 'react';

export function TaskImage({ src, alt, blurDataUrl }: { src: string; alt: string; blurDataUrl?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden">
      {blurDataUrl && (
        <img
          src={blurDataUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className="w-full h-auto"
      />
    </div>
  );
}
```

---

## Bundle Size Optimization

### Tree-shaking with Named Imports

```typescript
// ✅ GOOD: Named imports (tree-shakeable)
import { Button, Input, Card } from '@eridu/ui';

// ❌ BAD: Namespace imports (not tree-shakeable)
import * as UI from '@eridu/ui';
const button = <UI.Button />;
```

### Dynamic Imports for Heavy Libraries

```typescript
import { useState } from 'react';

export function ChartView({ data }: { data: ChartData }) {
  const [Chart, setChart] = useState<any>(null);

  useEffect(() => {
    // Only load chart library when component mounts
    import('recharts').then((module) => {
      setChart(() => module.LineChart);
    });
  }, []);

  if (!Chart) {
    return <LoadingSpinner />;
  }

  return <Chart data={data} />;
}
```

### Analyzing Bundle Size

```bash
# Build with analysis
npm run build -- --analyze

# Or add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: true,
    }),
  ],
});
```

---

## Web Vitals Monitoring

```typescript
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to your analytics service
  console.log(metric);
}

// Monitor Core Web Vitals
onCLS(sendToAnalytics);  // Cumulative Layout Shift
onFID(sendToAnalytics);  // First Input Delay
onFCP(sendToAnalytics);  // First Contentful Paint
onLCP(sendToAnalytics);  // Largest Contentful Paint
onTTFB(sendToAnalytics); // Time to First Byte
```

### Performance Observer

```typescript
// Monitor long tasks (>50ms)
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn('Long task detected:', entry);
  }
});

observer.observe({ entryTypes: ['longtask'] });
```
