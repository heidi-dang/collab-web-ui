import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  CircleDashed, 
  XCircle, 
  ChevronRight,
  ListTodo
} from 'lucide-react';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface AgentTask {
  id: string;
  title: string;
  status: TaskStatus;
  output?: string;
}

interface AgentTaskTrackerProps {
  planTitle?: string;
  tasks: AgentTask[];
}

export const AgentTaskTracker: React.FC<AgentTaskTrackerProps> = ({ 
  planTitle = 'Agent Execution Plan', 
  tasks 
}) => {
  const { completedCount, progressPercentage, isAllDone } = useMemo(() => {
    if (!tasks || tasks.length === 0) return { completedCount: 0, progressPercentage: 0, isAllDone: false };
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const progress = Math.round((completed / tasks.length) * 100);
    return {
      completedCount: completed,
      progressPercentage: progress,
      isAllDone: progress === 100,
    };
  }, [tasks]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-4 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-xl text-left"
    >
      {/* Header & Global Progress */}
      <div className="flex flex-col gap-3 border-b border-white/10 bg-zinc-900/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-6 h-6 rounded-md ${isAllDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
              <ListTodo size={14} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">{planTitle}</h3>
          </div>
          <span className="text-xs font-mono font-medium text-zinc-400">
            {completedCount} / {tasks.length}
          </span>
        </div>

        {/* Smooth Progress Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
          <motion.div
            className={`h-full ${isAllDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="flex flex-col p-2">
        <AnimatePresence mode="popLayout">
          {tasks.map((task, index) => (
            <TaskItem key={task.id || index} task={task} index={index} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const TaskItem: React.FC<{ task: AgentTask; index: number }> = ({ task, index }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasOutput = Boolean(task.output);

  const statusConfig = {
    pending: { icon: Circle, color: 'text-zinc-600', bg: 'bg-transparent', spin: false },
    in_progress: { icon: CircleDashed, color: 'text-indigo-400', bg: 'bg-indigo-500/10', spin: true },
    completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', spin: false },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', spin: false },
  };

  const Config = statusConfig[task.status] || statusConfig.pending;
  const Icon = Config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
      className={`group relative flex flex-col rounded-lg px-2 py-2 transition-colors ${Config.bg}`}
    >
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
          <Icon 
            size={16} 
            className={`${Config.color} ${Config.spin ? 'animate-[spin_3s_linear_infinite]' : ''}`} 
          />
        </div>

        {/* Title */}
        <span className={`text-sm flex-1 transition-all ${
          task.status === 'completed' ? 'text-zinc-400 line-through decoration-zinc-700' : 'text-zinc-200'
        }`}>
          {task.title}
        </span>

        {/* Expand/Collapse Toggle for output logs */}
        {hasOutput && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center p-1 text-zinc-500 hover:text-zinc-300 transition-colors rounded-md hover:bg-white/5 cursor-pointer"
            aria-expanded={isExpanded}
          >
            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
              <ChevronRight size={16} />
            </motion.div>
          </button>
        )}
      </div>

      {/* Output Details (Console logs, tool results, errors) */}
      <AnimatePresence>
        {isExpanded && hasOutput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-8 pl-3 border-l-2 border-white/10 py-1">
              <pre className="text-[11px] text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">
                {task.output}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
