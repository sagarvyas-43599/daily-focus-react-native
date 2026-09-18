import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
type TaskFilter = 'all' | 'active' | 'completed';

import {
  categories,
  createTaskId,
  maxTaskTitleLength,
  normalizeTasks,
  priorities,
  storageVersion,
  tasksStorageKey,
  validateTaskTitle,
  type Category,
  type Priority,
  type Task,
} from './taskUtils';

const initialTasks: Task[] = [
  { id: '1', title: 'Learn React Native basics', completed: false, priority: 'high', category: 'study' },
  { id: '2', title: 'Build my first screen', completed: true, priority: 'medium', category: 'study' },
];


export default function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTitleError, setTaskTitleError] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('medium');
  const [selectedCategory, setSelectedCategory] = useState<Category>('personal');
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [hasLoadedTasks, setHasLoadedTasks] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [activeModal, setActiveModal] = useState<'stats' | 'settings' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@daily-focus/dark-mode')
      .then((value) => setDarkMode(value === 'true'))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('@daily-focus/dark-mode', String(darkMode)).catch(() => undefined);
  }, [darkMode]);

  useEffect(() => {
    async function loadTasks() {
      try {
        const savedTasks = await AsyncStorage.getItem(tasksStorageKey);

        if (savedTasks) {
          setTasks(normalizeTasks(JSON.parse(savedTasks)));
        }
      } catch {
        setStorageError('Saved tasks could not be loaded.');
      } finally {
        setHasLoadedTasks(true);
      }
    }

    loadTasks();
  }, []);

  useEffect(() => {
    if (!hasLoadedTasks) {
      return;
    }

    const payload = JSON.stringify({ version: storageVersion, tasks });
    AsyncStorage.setItem(tasksStorageKey, payload)
      .then(() => setStorageError(''))
      .catch(() => setStorageError('Changes could not be saved on this device.'));
  }, [hasLoadedTasks, tasks]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const highPriorityCount = tasks.filter((task) => task.priority === 'high' && !task.completed).length;
  const themeStyles = darkMode ? darkStyles : lightStyles;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(normalizedSearchQuery);
    const matchesFilter =
      taskFilter === 'all' ||
      (taskFilter === 'completed' && task.completed) ||
      (taskFilter === 'active' && !task.completed);

    return matchesSearch && matchesFilter;
  });

  async function addTask() {
    const trimmedTitle = taskTitle.trim();
    const validationError = validateTaskTitle(taskTitle);

    if (validationError) {
      setTaskTitleError(validationError);
      return;
    }

    setTaskTitleError('');

    if (editingTaskId) {
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title: trimmedTitle,
                priority: selectedPriority,
                category: selectedCategory,
                dueDate: selectedDueDate?.toISOString(),
              }
            : task,
        ),
      );
      setEditingTaskId(null);
    } else {
      const taskId = createTaskId();
      setTasks((currentTasks) => [
        {
          id: taskId,
          title: trimmedTitle,
          completed: false,
          priority: selectedPriority,
          category: selectedCategory,
          dueDate: selectedDueDate?.toISOString(),
        },
        ...currentTasks,
      ]);
    }

    setTaskTitle('');
    setSelectedDueDate(null);
    Keyboard.dismiss();
  }

  function handleTaskTitleChange(value: string) {
    setTaskTitle(value);

    if (value.trim()) {
      setTaskTitleError('');
    }
  }

  function startEditingTask(task: Task) {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskTitleError('');
    setSelectedPriority(task.priority);
    setSelectedCategory(task.category);
    setSelectedDueDate(task.dueDate ? new Date(task.dueDate) : null);
  }

  function toggleTask(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );

  }

  function removeTask(taskId: string) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));

    if (editingTaskId === taskId) {
      setEditingTaskId(null);
      setTaskTitle('');
      setTaskTitleError('');
      setSelectedPriority('medium');
      setSelectedCategory('personal');
      setSelectedDueDate(null);
    }
  }

  function getPriorityStyle(priority: Priority) {
    switch (priority) {
      case 'low':
        return styles.priorityLow;
      case 'high':
        return styles.priorityHigh;
      default:
        return styles.priorityMedium;
    }
  }

  function getCategoryStyle(category: Category) {
    switch (category) {
      case 'work':
        return styles.categoryWork;
      case 'study':
        return styles.categoryStudy;
      default:
        return styles.categoryPersonal;
    }
  }

  function openDueDatePicker() {
    setDatePickerMode('date');
    setShowDatePicker(true);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safeArea, themeStyles.safeArea]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <View style={[styles.container, themeStyles.container]}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MY FIRST APP REACT NATIVE</Text>
          <View style={styles.titleRow}>
            <Text style={[styles.title, themeStyles.title]}>Daily Focus</Text>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Open statistics"
                accessibilityRole="button"
                onPress={() => setActiveModal('stats')}
                style={styles.utilityButton}
              >
                <Text style={styles.utilityButtonText}>Stats</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Open settings"
                accessibilityRole="button"
                onPress={() => setActiveModal('settings')}
                style={styles.utilityButton}
              >
                <Text style={styles.utilityButtonText}>Settings</Text>
              </Pressable>
            </View>
          </View>
          <Text style={[styles.subtitle, themeStyles.subtitle]}>Small steps make big progress.</Text>
        </View>

        <View style={styles.progressCard}>
          <View>
            <Text style={styles.progressLabel}>TODAY'S PROGRESS</Text>
            <Text style={styles.progressValue}>
              {completedCount} <Text style={styles.progressTotal}>/ {tasks.length} done</Text>
            </Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPercent}>
              {tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}%
            </Text>
          </View>
        </View>

        {storageError ? <Text style={styles.storageError}>{storageError}</Text> : null}

        <View style={styles.inputRow}>
          <TextInput
            value={taskTitle}
            onChangeText={handleTaskTitleChange}
            onSubmitEditing={addTask}
            placeholder={editingTaskId ? 'Update your task...' : 'What will you finish today?'}
            placeholderTextColor="#8B92A5"
            returnKeyType="done"
            maxLength={maxTaskTitleLength}
            style={[styles.input, taskTitleError && styles.inputError]}
            accessibilityLabel={editingTaskId ? 'Edit task title' : 'New task title'}
          />
          <Pressable
            accessibilityLabel="Add task"
            accessibilityRole="button"
            onPress={addTask}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Text style={styles.addButtonText}>{editingTaskId ? '✓' : '+'}</Text>
          </Pressable>
        </View>

        {taskTitleError ? <Text style={styles.errorText}>{taskTitleError}</Text> : null}

        <View style={styles.priorityRow}>
          <Text style={styles.priorityLabel}>PRIORITY</Text>
          <View style={styles.priorityOptions}>
            {priorities.map((priority) => (
              <Pressable
                key={priority}
                accessibilityLabel={`${priority} priority`}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedPriority === priority }}
                onPress={() => setSelectedPriority(priority)}
                style={[
                  styles.priorityOption,
                  getPriorityStyle(priority),
                  selectedPriority === priority && styles.priorityOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.priorityOptionText,
                    selectedPriority === priority && styles.priorityOptionTextSelected,
                  ]}
                >
                  {priority}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.categoryRow}>
          <Text style={styles.priorityLabel}>CATEGORY</Text>
          <View style={styles.priorityOptions}>
            {categories.map((category) => (
              <Pressable
                key={category}
                accessibilityLabel={`${category} category`}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedCategory === category }}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.priorityOption,
                  getCategoryStyle(category),
                  selectedCategory === category && styles.priorityOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.priorityOptionText,
                    selectedCategory === category && styles.priorityOptionTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.dueDateRow}>
          <Pressable
            accessibilityLabel={selectedDueDate ? 'Change due date' : 'Set due date'}
            accessibilityRole="button"
            onPress={openDueDatePicker}
            style={styles.dueDateButton}
          >
            <Text style={styles.dueDateButtonText}>
              {selectedDueDate ? `Due ${selectedDueDate.toLocaleString()}` : 'Set due date and reminder'}
            </Text>
          </Pressable>
          {selectedDueDate ? (
            <Pressable
              accessibilityLabel="Clear due date"
              accessibilityRole="button"
              onPress={() => {
                setSelectedDueDate(null);
                setShowDatePicker(false);
              }}
              hitSlop={10}
            >
              <Text style={styles.clearDueDateText}>×</Text>
            </Pressable>
          ) : null}
        </View>

        {showDatePicker ? (
          <DateTimePicker
            value={selectedDueDate ?? new Date(Date.now() + 60 * 60 * 1000)}
              mode={Platform.OS === 'android' ? datePickerMode : 'datetime'}
              minimumDate={new Date()}
              onValueChange={(_, date) => {
                if (Platform.OS === 'android' && datePickerMode === 'date') {
                  setSelectedDueDate(date);
                  setDatePickerMode('time');
                  return;
                }

                setSelectedDueDate(date);
                setShowDatePicker(false);
              }}
              onDismiss={() => setShowDatePicker(false)}
          />
        ) : null}

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search tasks..."
          placeholderTextColor="#8B92A5"
          style={styles.searchInput}
          accessibilityLabel="Search tasks"
        />

        <View style={styles.filterRow}>
          {(['all', 'active', 'completed'] as TaskFilter[]).map((filter) => (
            <Pressable
              key={filter}
              accessibilityLabel={`Show ${filter} tasks`}
              accessibilityRole="radio"
              accessibilityState={{ selected: taskFilter === filter }}
              onPress={() => setTaskFilter(filter)}
              style={[styles.filterButton, taskFilter === filter && styles.filterButtonSelected]}
            >
              <Text style={[styles.filterText, taskFilter === filter && styles.filterTextSelected]}>
                {filter}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, themeStyles.sectionTitle]}>YOUR TASKS</Text>
        <FlatList
          data={visibleTasks}
          keyExtractor={(task) => task.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {tasks.length ? 'No matching tasks found.' : 'Your task list is clear.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.taskRow}>
              <Pressable
                accessibilityLabel={item.completed ? `Mark ${item.title} incomplete` : `Complete ${item.title}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.completed }}
                onPress={() => toggleTask(item.id)}
                style={[styles.check, item.completed && styles.checkCompleted]}
              >
                {item.completed && <Text style={styles.checkMark}>✓</Text>}
              </Pressable>
              <Text style={[styles.taskTitle, item.completed && styles.taskCompleted]}>
                {item.title}
              </Text>
              <View style={[styles.priorityBadge, getPriorityStyle(item.priority)]}>
                <Text style={styles.priorityBadgeText}>{item.priority}</Text>
              </View>
              <View style={[styles.categoryBadge, getCategoryStyle(item.category)]}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
              <Pressable
                accessibilityLabel={`Edit ${item.title}`}
                accessibilityRole="button"
                onPress={() => startEditingTask(item)}
                hitSlop={10}
                style={styles.editButton}
              >
                <Text style={styles.editText}>✎</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Delete ${item.title}`}
                accessibilityRole="button"
                onPress={() => removeTask(item.id)}
                hitSlop={10}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteText}>×</Text>
              </Pressable>
            </View>
          )}
        />
      </View>
      <Modal visible={activeModal !== null} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, themeStyles.modalCard]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themeStyles.title]}>
                {activeModal === 'stats' ? 'Your statistics' : 'Settings'}
              </Text>
              <Pressable onPress={() => setActiveModal(null)} hitSlop={10}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            {activeModal === 'stats' ? (
              <View style={styles.statsGrid}>
                <View style={[styles.statItem, themeStyles.statItem]}><Text style={styles.statValue}>{tasks.length}</Text><Text style={styles.statLabel}>Total tasks</Text></View>
                <View style={[styles.statItem, themeStyles.statItem]}><Text style={styles.statValue}>{completedCount}</Text><Text style={styles.statLabel}>Completed</Text></View>
                <View style={[styles.statItem, themeStyles.statItem]}><Text style={styles.statValue}>{activeCount}</Text><Text style={styles.statLabel}>Active</Text></View>
                <View style={[styles.statItem, themeStyles.statItem]}><Text style={styles.statValue}>{highPriorityCount}</Text><Text style={styles.statLabel}>High priority</Text></View>
              </View>
            ) : (
              <View style={styles.settingRow}>
                <View><Text style={[styles.settingTitle, themeStyles.title]}>Dark mode</Text><Text style={styles.settingDescription}>Use a darker color theme.</Text></View>
                <Switch value={darkMode} onValueChange={setDarkMode} />
              </View>
            )}
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 14,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 12,
  },
  utilityButton: {
    backgroundColor: '#6B5AED',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  utilityButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  eyebrow: {
    color: '#6B5AED',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  title: {
    color: '#171A2B',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#737A8E',
    fontSize: 15,
    marginTop: 6,
  },
  progressCard: {
    alignItems: 'center',
    backgroundColor: '#171A2B',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 14,
  },
  progressLabel: {
    color: '#A9AEC2',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  progressValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  progressTotal: {
    color: '#A9AEC2',
    fontSize: 14,
    fontWeight: '500',
  },
  progressCircle: {
    alignItems: 'center',
    borderColor: '#8E84FF',
    borderRadius: 32,
    borderWidth: 4,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  progressPercent: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E5ED',
    borderRadius: 14,
    borderWidth: 1,
    color: '#171A2B',
    flex: 1,
    fontSize: 15,
    height: 52,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: '#D94F4F',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#6B5AED',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
  pressed: {
    opacity: 0.75,
  },
  errorText: {
    color: '#D94F4F',
    fontSize: 12,
    marginBottom: 8,
    marginTop: -18,
  },
  storageError: {
    color: '#A33F3F',
    fontSize: 12,
    marginBottom: 8,
  },
  priorityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  priorityLabel: {
    color: '#8B92A5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginRight: 14,
  },
  priorityOptions: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  priorityOption: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  priorityLow: {
    backgroundColor: '#E9F7EF',
    borderColor: '#B9E5C9',
  },
  priorityMedium: {
    backgroundColor: '#FFF6DD',
    borderColor: '#F1D58A',
  },
  priorityHigh: {
    backgroundColor: '#FDE9E7',
    borderColor: '#F2B8B2',
  },
  priorityOptionSelected: {
    borderColor: '#171A2B',
    borderWidth: 2,
  },
  priorityOptionText: {
    color: '#555C70',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priorityOptionTextSelected: {
    color: '#171A2B',
    fontWeight: '800',
  },
  categoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryPersonal: {
    backgroundColor: '#EEF0FF',
    borderColor: '#C7C9F5',
  },
  categoryWork: {
    backgroundColor: '#E8F3FC',
    borderColor: '#B9D9F2',
  },
  categoryStudy: {
    backgroundColor: '#F3ECFF',
    borderColor: '#D8C4F7',
  },
  dueDateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  dueDateButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7D9E5',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dueDateButtonText: {
    color: '#555C70',
    fontSize: 13,
    fontWeight: '600',
  },
  clearDueDateText: {
    color: '#A1A6B6',
    fontSize: 24,
    marginLeft: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E5ED',
    borderRadius: 14,
    borderWidth: 1,
    color: '#171A2B',
    fontSize: 15,
    height: 48,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E5ED',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterButtonSelected: {
    backgroundColor: '#171A2B',
    borderColor: '#171A2B',
  },
  filterText: {
    color: '#737A8E',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  filterTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#8B92A5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  listContent: {
    gap: 8,
    paddingBottom: 16,
  },
  taskRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: 16,
  },
  check: {
    alignItems: 'center',
    borderColor: '#C9CDDA',
    borderRadius: 10,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    marginRight: 12,
    width: 24,
  },
  checkCompleted: {
    backgroundColor: '#6B5AED',
    borderColor: '#6B5AED',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  taskTitle: {
    color: '#292D3D',
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  taskCompleted: {
    color: '#A1A6B6',
    textDecorationLine: 'line-through',
  },
  priorityBadge: {
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  priorityBadgeText: {
    color: '#555C70',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  categoryBadge: {
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    color: '#555C70',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  editButton: {
    marginLeft: 12,
    paddingLeft: 8,
  },
  editText: {
    color: '#6B5AED',
    fontSize: 21,
  },
  deleteButton: {
    marginLeft: 12,
    paddingLeft: 8,
  },
  deleteText: {
    color: '#A1A6B6',
    fontSize: 24,
    fontWeight: '300',
  },
  emptyText: {
    color: '#8B92A5',
    fontSize: 15,
    paddingVertical: 24,
    textAlign: 'center',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(10, 12, 24, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  closeText: {
    color: '#8B92A5',
    fontSize: 28,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    backgroundColor: '#F5F6FA',
    borderRadius: 14,
    padding: 16,
    width: '48%',
  },
  statValue: {
    color: '#6B5AED',
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: '#737A8E',
    fontSize: 12,
    marginTop: 4,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  settingDescription: {
    color: '#737A8E',
    fontSize: 13,
    marginTop: 4,
  },
});

const lightStyles = {
  safeArea: { backgroundColor: '#F5F6FA' },
  container: { backgroundColor: '#F5F6FA' },
  title: { color: '#171A2B' },
  subtitle: { color: '#737A8E' },
  sectionTitle: { color: '#8B92A5' },
  modalCard: { backgroundColor: '#FFFFFF' },
  statItem: { backgroundColor: '#F5F6FA' },
};

const darkStyles = {
  safeArea: { backgroundColor: '#10121C' },
  container: { backgroundColor: '#10121C' },
  title: { color: '#FFFFFF' },
  subtitle: { color: '#B8BED0' },
  sectionTitle: { color: '#B8BED0' },
  modalCard: { backgroundColor: '#1B1F2D' },
  statItem: { backgroundColor: '#252A3A' },
};
