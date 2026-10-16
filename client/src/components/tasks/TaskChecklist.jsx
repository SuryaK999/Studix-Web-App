import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, ListTodo } from 'lucide-react';
import { toast } from 'sonner';

const TASK_MAX_LENGTH = 200;

// Skeleton for initial load
function TaskSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg">
      <div className="w-4 h-4 rounded skeleton" />
      <div className="flex-1 h-3.5 skeleton rounded" />
    </div>
  );
}

export function TaskChecklist({ roomId }) {
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const tasksQuery = query(
      collection(db, 'rooms', roomId, 'tasks'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const tasksData = [];
        snapshot.forEach((doc) => {
          tasksData.push({ id: doc.id, ...doc.data() });
        });
        setTasks(tasksData);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to tasks:', error);
        toast.error('Failed to load tasks');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  const addTask = useCallback(async (e) => {
    e.preventDefault();
    const text = newTaskText.trim();
    if (!text || !user) return;
    if (text.length > TASK_MAX_LENGTH) {
      toast.error(`Task must be under ${TASK_MAX_LENGTH} characters`);
      return;
    }

    setIsAdding(true);
    try {
      await addDoc(collection(db, 'rooms', roomId, 'tasks'), {
        text,
        completed: false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setNewTaskText('');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    } finally {
      setIsAdding(false);
    }
  }, [newTaskText, user, roomId]);

  const toggleTask = useCallback(async (taskId, currentCompleted) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !currentCompleted } : t))
    );

    try {
      const taskRef = doc(db, 'rooms', roomId, 'tasks', taskId);
      await updateDoc(taskRef, { completed: !currentCompleted });
    } catch (error) {
      // Rollback on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: currentCompleted } : t))
      );
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
    }
  }, [roomId]);

  const deleteTask = useCallback(async (taskId) => {
    // Optimistic remove
    const previousTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await deleteDoc(doc(db, 'rooms', roomId, 'tasks', taskId));
    } catch (error) {
      // Rollback on failure
      setTasks(previousTasks);
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  }, [roomId, tasks]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Progress Bar & Header Stats */}
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] font-medium text-[#A1A3AB]">Progress</span>
          <span className="text-[12px] font-bold text-white">
            {completedCount}/{tasks.length}
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#1A1A22] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#7148EB]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Add Task */}
      <form onSubmit={addTask} className="mb-3 px-1">
        <div className="flex gap-2 relative">
          <Input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value.slice(0, TASK_MAX_LENGTH))}
            placeholder="Add a new task..."
            className="flex-1 bg-[#1A1A22] text-white border-0 focus:ring-1 focus:ring-[#7148EB] text-[13px] h-9 rounded-lg placeholder:text-[#6F7483]"
            disabled={isAdding}
            maxLength={TASK_MAX_LENGTH}
          />
          <Button
            type="submit"
            disabled={isAdding || !newTaskText.trim()}
            className="bg-[#7148EB] hover:bg-[#6039CE] text-white px-2.5 h-9 rounded-lg transition-colors border-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Task List */}
      <ScrollArea className="flex-1 w-full -mr-4 pr-4 custom-scrollbar">
        <div className="space-y-1">
          {loading ? (
            <>
              <TaskSkeleton />
              <TaskSkeleton />
              <TaskSkeleton />
            </>
          ) : (
            <AnimatePresence>
              {tasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-6 text-[#6F7483]"
                >
                  <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-[13px] font-medium">No tasks yet</p>
                </motion.div>
              ) : (
                tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    layout
                    className={`flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#1A1A22] transition-colors group ${
                      task.completed ? 'opacity-50' : ''
                    }`}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id, task.completed)}
                      className="mt-0.5 data-[state=checked]:bg-[#10B981] data-[state=checked]:border-[#10B981] border-[#6F7483]"
                    />
                    <span
                      className={`flex-1 text-[13px] leading-tight mt-0.5 ${
                        task.completed
                          ? 'line-through text-[#6F7483]'
                          : 'text-[#D1D3D8] group-hover:text-white'
                      }`}
                    >
                      {task.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#F43F5E] hover:text-white hover:bg-[#F43F5E] w-7 h-7 transition-all -mr-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
