import React, { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, Calendar, Tag } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function TasksView({ tasks, onAddTask, onToggleTask, onDeleteTask }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Cobrança');
  const [priority, setPriority] = useState('alta');
  const [dueDate, setDueDate] = useState(todayStr);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask({
      title: title.trim(),
      category,
      priority,
      dueDate,
      completed: false,
    });
    setTitle('');
  };

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Tarefas do Alexandre • Rotina All System
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Organize suas cobranças de parcelas, cotações de produtos, garantias e metas do dia
        </p>
      </div>

      {/* Formulário Rápido de Tarefa */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-3"
      >
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Adicionar nova tarefa para o Alexandre (ex: Cobrar parcela do cliente X, cotar SSD...)"
          className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <option value="Cobrança">Cobrança</option>
            <option value="Compras & Estoque">Compras & Estoque</option>
            <option value="Garantia">Garantia</option>
            <option value="Financeiro">Financeiro</option>
            <option value="Gestão">Gestão</option>
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <option value="alta">Prioridade Alta</option>
            <option value="media">Prioridade Média</option>
            <option value="baixa">Prioridade Baixa</option>
          </select>

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          />

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 transition"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </form>

      {/* Lista de Pendentes e Concluídas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
            Pendentes ({pendingTasks.length})
          </h3>
          <div className="space-y-2.5">
            {pendingTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Tudo em dia! Nenhuma tarefa pendente.
              </p>
            ) : (
              pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800"
                >
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className="flex items-start gap-3 text-left flex-1"
                  >
                    <Square className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                          {task.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            task.priority === 'alta'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : task.priority === 'media'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {task.priority.toUpperCase()}
                        </span>
                        <span className="text-slate-400">{formatDate(task.dueDate)}</span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
            Concluídas ({completedTasks.length})
          </h3>
          <div className="space-y-2.5">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 opacity-70"
              >
                <button
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  className="flex items-center gap-3 text-left flex-1"
                >
                  <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-sm line-through text-slate-500 dark:text-slate-400">
                    {task.title}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
