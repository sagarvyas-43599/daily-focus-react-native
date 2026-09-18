import {
  maxTaskTitleLength,
  normalizeTasks,
  validateTaskTitle,
} from './taskUtils';

describe('task title validation', () => {
  it('rejects empty and whitespace-only titles', () => {
    expect(validateTaskTitle('')).toBe('Task title is required.');
    expect(validateTaskTitle('   ')).toBe('Task title is required.');
  });

  it('rejects titles longer than the supported limit', () => {
    expect(validateTaskTitle('a'.repeat(maxTaskTitleLength + 1))).toContain('120');
  });

  it('accepts a trimmed valid title', () => {
    expect(validateTaskTitle('  Plan tomorrow  ')).toBe('');
  });
});

describe('task storage normalization', () => {
  it('migrates old tasks with safe defaults', () => {
    expect(
      normalizeTasks([
        { id: 'old-1', title: '  Existing task ', completed: true },
        { id: 'old-2', title: '', completed: false },
      ]),
    ).toEqual([
      {
        id: 'old-1',
        title: 'Existing task',
        completed: true,
        priority: 'medium',
        category: 'personal',
      },
    ]);
  });

  it('rejects malformed storage values', () => {
    expect(normalizeTasks({ invalid: true })).toEqual([]);
    expect(normalizeTasks(null)).toEqual([]);
  });
});
