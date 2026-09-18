export type Priority = 'low' | 'medium' | 'high';
export type Category = 'personal' | 'work' | 'study';

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  category: Category;
  dueDate?: string;
};

export const priorities: Priority[] = ['low', 'medium', 'high'];
export const categories: Category[] = ['personal', 'work', 'study'];
export const maxTaskTitleLength = 120;
export const storageVersion = 1;
export const tasksStorageKey = '@daily-focus/tasks';

export function createTaskId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isPriority(value: unknown): value is Priority {
  return priorities.includes(value as Priority);
}

export function isCategory(value: unknown): value is Category {
  return categories.includes(value as Category);
}

export function normalizeTasks(value: unknown): Task[] {
  const storedTasks = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && 'tasks' in value
      ? (value as { tasks?: unknown }).tasks
      : null;

  if (!Array.isArray(storedTasks)) {
    return [];
  }

  return storedTasks.flatMap((task): Task[] => {
    if (!task || typeof task !== 'object') {
      return [];
    }

    const candidate = task as Partial<Task>;
    const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';

    if (!title) {
      return [];
    }

    return [{
      id: typeof candidate.id === 'string' && candidate.id ? candidate.id : createTaskId(),
      title: title.slice(0, maxTaskTitleLength),
      completed: candidate.completed === true,
      priority: isPriority(candidate.priority) ? candidate.priority : 'medium',
      category: isCategory(candidate.category) ? candidate.category : 'personal',
      dueDate: typeof candidate.dueDate === 'string' ? candidate.dueDate : undefined,
    }];
  });
}

export function validateTaskTitle(value: string): string {
  const title = value.trim();

  if (!title) {
    return 'Task title is required.';
  }

  if (title.length > maxTaskTitleLength) {
    return `Task title must be ${maxTaskTitleLength} characters or fewer.`;
  }

  return '';
}
