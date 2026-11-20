import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { RotateCcw, Filter } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useWorkspaceRealtime } from '../hooks/useWorkspaceRealtime';
import { GlassAmbientCanvas } from '../App';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import CommandBar from '../components/CommandBar';
import AIPreview from '../components/AIPreview';
import KanbanBoard from '../components/KanbanBoard';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import StatsCards from '../components/StatsCards';
import ActivityFeed from '../components/ActivityFeed';
import StandupModal from '../components/StandupModal';
import MemberModal from '../components/MemberModal';
import ProjectModal from '../components/ProjectModal';

const INITIAL_FILTERS = {
  status: '',
  priority: '',
  assignee: '',
  projectId: '',
  tag: '',
  q: '',
};

export default function Workspace() {
  const {
    user,
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    realtimeConfig,
    logout,
    createWorkspace,
  } = useAuth();

  const queryClient = useQueryClient();
  const commandInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('board');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);

  // Modals & AI Preview state
  const [aiPreviewData, setAiPreviewData] = useState(null);
  const [taskModalState, setTaskModalState] = useState({
    isOpen: false,
    task: null,
    defaultStatus: 'BACKLOG',
  });
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [olderActivities, setOlderActivities] = useState([]);
  const [isFetchingMoreActivity, setIsFetchingMoreActivity] = useState(false);

  const wid = activeWorkspaceId;

  // Connect Pusher Channels presence & live cache updates (or 15s polling fallback)
  const { onlineMembers, isConnected, mode: realtimeMode } = useWorkspaceRealtime(
    wid,
    realtimeConfig,
    user
  );

  const pollInterval = realtimeMode === 'polling' ? 15000 : false;

  // Fetch Workspace Projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects', wid],
    queryFn: () => api.get(`/workspaces/${wid}/projects`),
    enabled: Boolean(wid),
    refetchInterval: pollInterval,
  });
  const projects = projectsData?.projects || [];

  // Fetch Workspace Members
  const { data: membersData } = useQuery({
    queryKey: ['members', wid],
    queryFn: () => api.get(`/workspaces/${wid}/members`),
    enabled: Boolean(wid),
    refetchInterval: pollInterval,
  });
  const members = membersData?.members || [];

  // Build Tasks Query String
  const limit = activeTab === 'list' ? 15 : 200;
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.priority) queryParams.set('priority', filters.priority);
  if (filters.assignee) queryParams.set('assignee', filters.assignee);
  if (filters.projectId) queryParams.set('projectId', filters.projectId);
  if (filters.tag) queryParams.set('tag', filters.tag);
  if (filters.q) queryParams.set('q', filters.q);
  queryParams.set('page', activeTab === 'list' ? String(page) : '1');
  queryParams.set('limit', String(limit));
  const queryString = queryParams.toString();

  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks', wid, queryString],
    queryFn: () => api.get(`/workspaces/${wid}/tasks?${queryString}`),
    enabled: Boolean(wid),
    refetchInterval: pollInterval,
  });

  const tasks = tasksData?.tasks || [];
  const totalTasks = tasksData?.total || 0;
  const totalPages = tasksData?.totalPages || 1;

  // Fetch Dashboard Stats
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['stats', wid],
    queryFn: () => api.get(`/workspaces/${wid}/stats`),
    enabled: Boolean(wid),
    refetchInterval: pollInterval,
  });

  // Fetch Activity Stream
  const { data: activityData, isLoading: isActivityLoading } = useQuery({
    queryKey: ['activity', wid],
    queryFn: async () => {
      setOlderActivities([]);
      return api.get(`/workspaces/${wid}/activity?limit=20`);
    },
    enabled: Boolean(wid),
    refetchInterval: pollInterval,
  });

  const primaryActivities = activityData?.activities || [];
  const combinedActivities = [
    ...primaryActivities,
    ...olderActivities.filter(
      (oldAct) => !primaryActivities.some((p) => Number(p.id) === Number(oldAct.id))
    ),
  ];
  const lastActivityId =
    combinedActivities.length > 0
      ? combinedActivities[combinedActivities.length - 1].id
      : null;
  const hasMoreActivity =
    olderActivities.length > 0
      ? olderActivities[olderActivities.length - 1]?._hasMore !== false
      : Boolean(activityData?.hasMore);

  const handleLoadMoreActivity = async () => {
    if (!wid || !lastActivityId || isFetchingMoreActivity) return;
    setIsFetchingMoreActivity(true);
    try {
      const more = await api.get(
        `/workspaces/${wid}/activity?before=${lastActivityId}&limit=20`
      );
      const list = (more?.activities || []).map((a, idx, arr) =>
        idx === arr.length - 1 ? { ...a, _hasMore: Boolean(more?.hasMore) } : a
      );
      setOlderActivities((prev) => [...prev, ...list]);
    } catch (err) {
      toast.error(err.message || 'Could not load older activity');
    } finally {
      setIsFetchingMoreActivity(false);
    }
  };

  // Optimistic Status Update Mutation (for Kanban Drag & Drop + Inline List dropdown)
  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }) =>
      api.patch(`/workspaces/${wid}/tasks/${taskId}`, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', wid] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ['tasks', wid] });

      queryClient.setQueriesData({ queryKey: ['tasks', wid] }, (old) => {
        if (!old || !Array.isArray(old.tasks)) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            Number(t.id) === Number(taskId) ? { ...t, status } : t
          ),
        };
      });

      return { previousQueries };
    },
    onError: (err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error(err.message || 'Could not move task — rolled back');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', wid] });
      queryClient.invalidateQueries({ queryKey: ['stats', wid] });
      queryClient.invalidateQueries({ queryKey: ['activity', wid] });
    },
  });

  const handleStatusChange = useCallback(
    (task, newStatus) => {
      if (!task || task.status === newStatus) return;
      statusMutation.mutate({ taskId: task.id, status: newStatus });
      toast.success(`${task.code} → ${newStatus.replace('_', ' ')}`);
    },
    [statusMutation]
  );

  const handleSaveTask = async (payload) => {
    if (payload.id) {
      const { id, ...patchBody } = payload;
      await api.patch(`/workspaces/${wid}/tasks/${id}`, patchBody);
      toast.success('Task updated');
    } else {
      const res = await api.post(`/workspaces/${wid}/tasks`, payload);
      toast.success(`Created ${res?.task?.code || 'task'}`);
    }
    queryClient.invalidateQueries({ queryKey: ['tasks', wid] });
    queryClient.invalidateQueries({ queryKey: ['stats', wid] });
    queryClient.invalidateQueries({ queryKey: ['activity', wid] });
  };

  const handleDeleteTask = async (taskId) => {
    await api.delete(`/workspaces/${wid}/tasks/${taskId}`);
    toast.success('Task deleted');
    queryClient.invalidateQueries({ queryKey: ['tasks', wid] });
    queryClient.invalidateQueries({ queryKey: ['stats', wid] });
    queryClient.invalidateQueries({ queryKey: ['activity', wid] });
  };

  const handleAddMember = async ({ email, role }) => {
    await api.post(`/workspaces/${wid}/members`, { email, role });
    queryClient.invalidateQueries({ queryKey: ['members', wid] });
    queryClient.invalidateQueries({ queryKey: ['activity', wid] });
  };

  const handleCreateProject = async ({ name, key, description }) => {
    await api.post(`/workspaces/${wid}/projects`, { name, key, description });
    queryClient.invalidateQueries({ queryKey: ['projects', wid] });
    queryClient.invalidateQueries({ queryKey: ['activity', wid] });
  };

  const handleUpdateFilter = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setPage(1);
    setFilters(INITIAL_FILTERS);
  };

  const handleApplyAIFilters = (aiFilters) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      status: aiFilters.status || '',
      priority: aiFilters.priority || '',
      assignee: aiFilters.assigneeId ? String(aiFilters.assigneeId) : '',
      tag: aiFilters.tag || (Array.isArray(aiFilters.tags) ? aiFilters.tags[0] || '' : ''),
      q: aiFilters.q || '',
    }));
  };

  const hasActiveFilters = Boolean(
    filters.status ||
      filters.priority ||
      filters.assignee ||
      filters.tag ||
      filters.q ||
      filters.projectId
  );

  return (
    <div className="relative min-h-screen bg-[#FFFFFF] dark:bg-[#07080D] text-[#111216] dark:text-[#F5F6FA]">
      {/* Fixed Luminous Ambient Canvas (Sky-blue + Lavender/Violet Blurs) */}
      <GlassAmbientCanvas />

      {/* Outer Floating Viewport Frame: 12px outer padding, 16px layout gap */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-stretch gap-4 p-3 max-w-[1680px] mx-auto">
        {/* Floating Left Glass Panel */}
        <Sidebar
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={(nextId) => {
            setActiveWorkspaceId(nextId);
            handleResetFilters();
          }}
          onCreateWorkspace={createWorkspace}
          projects={projects}
          selectedProjectId={filters.projectId}
          onSelectProject={(projId) => handleUpdateFilter('projectId', projId)}
          onOpenProjectModal={() => setIsProjectModalOpen(true)}
          members={members}
          onlineMembers={onlineMembers}
          onOpenMemberModal={() => setIsMemberModalOpen(true)}
          onFocusCommandBar={() => commandInputRef.current?.focus()}
        />

        {/* Right Main Column: Floating TopBar + AI Command Bar + View Canvas */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <TopBar
            user={user}
            activeWorkspace={activeWorkspace}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onlineMembers={onlineMembers}
            realtimeMode={realtimeMode}
            isConnected={isConnected}
            onFocusCommandBar={() => commandInputRef.current?.focus()}
            onOpenNewTask={() =>
              setTaskModalState({ isOpen: true, task: null, defaultStatus: 'BACKLOG' })
            }
            onOpenStandup={() => setIsStandupOpen(true)}
            onLogout={logout}
          />

          <main className="flex-1 min-w-0 flex flex-col">
            {/* Persistent AI Command Bar (Cmd+K + Voice Capture) */}
            <CommandBar
              workspaceId={wid}
              inputRef={commandInputRef}
              onPreviewReady={(data) => setAiPreviewData(data)}
            />

            {/* Active AI / Workspace Filters Banner */}
            {hasActiveFilters && activeTab === 'board' && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[16px] linear-panel-elevated border-l-[3px] border-l-[#6531F7] dark:border-l-[#855BFF] px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-[#111216] dark:text-[#F5F6FA] flex items-center gap-1.5">
                    <Filter className="h-4 w-4 text-[#6531F7] dark:text-[#9D7AFF]" />
                    <span>Active Filters</span>
                  </span>
                  {Object.entries(filters)
                    .filter(([, val]) => Boolean(val))
                    .map(([key, val]) => (
                      <span
                        key={key}
                        className="linear-tag !bg-white/85 dark:!bg-white/10 !border-[#111216]/10 dark:!border-white/15 !text-[#111216] dark:!text-[#F5F6FA]"
                      >
                        <span className="text-[#111216]/50 dark:text-[#F5F6FA]/55">{key}:</span>
                        <span className="text-[#111216] dark:text-[#F5F6FA] font-semibold">{val}</span>
                      </span>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn-tertiary !py-1.5 !px-2.5 !text-[13px]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            )}

            {/* Workspace Loading Skeleton before workspace ID initializes */}
            {!wid ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                {[0, 1, 2, 3].map((col) => (
                  <div
                    key={col}
                    className="linear-panel p-4 space-y-3"
                  >
                    <div className="h-4 w-24 rounded-md bg-white/70 dark:bg-white/10 animate-pulse" />
                    <div className="h-24 rounded-[12px] bg-white/60 dark:bg-white/8 animate-pulse" />
                    <div className="h-20 rounded-[12px] bg-white/60 dark:bg-white/8 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* TAB 1: KANBAN BOARD */}
                {activeTab === 'board' && (
                  <KanbanBoard
                    tasks={tasks}
                    isLoading={isTasksLoading}
                    onTaskClick={(task) =>
                      setTaskModalState({ isOpen: true, task, defaultStatus: task.status })
                    }
                    onStatusChange={handleStatusChange}
                    onOpenNewTaskWithStatus={(status) =>
                      setTaskModalState({ isOpen: true, task: null, defaultStatus: status })
                    }
                  />
                )}

                {/* TAB 2: LIST VIEW */}
                {activeTab === 'list' && (
                  <TaskList
                    tasks={tasks}
                    total={totalTasks}
                    page={page}
                    totalPages={totalPages}
                    filters={filters}
                    onUpdateFilter={handleUpdateFilter}
                    onResetFilters={handleResetFilters}
                    onPageChange={setPage}
                    members={members}
                    onTaskClick={(task) =>
                      setTaskModalState({ isOpen: true, task, defaultStatus: task.status })
                    }
                    onStatusChange={handleStatusChange}
                    isLoading={isTasksLoading}
                  />
                )}

                {/* TAB 3: DASHBOARD (STATS + RECENT ACTIVITY) */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-5">
                    <StatsCards
                      stats={statsData?.stats}
                      isLoading={isStatsLoading}
                      onOpenStandup={() => setIsStandupOpen(true)}
                    />
                    <ActivityFeed
                      activities={combinedActivities}
                      hasMore={hasMoreActivity}
                      isLoading={isActivityLoading}
                      isFetchingMore={isFetchingMoreActivity}
                      onLoadMore={handleLoadMoreActivity}
                      compact
                    />
                  </div>
                )}

                {/* TAB 4: FULL LIVE ACTIVITY FEED */}
                {activeTab === 'activity' && (
                  <ActivityFeed
                    activities={combinedActivities}
                    hasMore={hasMoreActivity}
                    isLoading={isActivityLoading}
                    isFetchingMore={isFetchingMoreActivity}
                    onLoadMore={handleLoadMoreActivity}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* AI Structured Preview Modal */}
      {aiPreviewData && (
        <AIPreview
          workspaceId={wid}
          previewData={aiPreviewData}
          members={members}
          projects={projects}
          onClose={() => setAiPreviewData(null)}
          onExecuted={() => {
            queryClient.invalidateQueries({ queryKey: ['tasks', wid] });
            queryClient.invalidateQueries({ queryKey: ['stats', wid] });
            queryClient.invalidateQueries({ queryKey: ['activity', wid] });
          }}
          onApplyFilters={handleApplyAIFilters}
        />
      )}

      {/* Create / Edit Task Modal */}
      <TaskModal
        isOpen={taskModalState.isOpen}
        initialTask={taskModalState.task}
        defaultStatus={taskModalState.defaultStatus}
        projects={projects}
        members={members}
        selectedProjectId={filters.projectId}
        onClose={() =>
          setTaskModalState({ isOpen: false, task: null, defaultStatus: 'BACKLOG' })
        }
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      {/* AI Daily Standup Modal */}
      <StandupModal
        isOpen={isStandupOpen}
        workspaceId={wid}
        workspaceName={activeWorkspace?.name}
        onClose={() => setIsStandupOpen(false)}
      />

      {/* Invite Member Modal (Owner Only) */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onAddMember={handleAddMember}
      />

      {/* Create Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
