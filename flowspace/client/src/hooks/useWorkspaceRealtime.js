import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { useQueryClient } from '@tanstack/react-query';
import { setRealtimeSocketId } from '../api/client';

export function useWorkspaceRealtime(workspaceId, realtimeConfig, currentUser) {
  const queryClient = useQueryClient();
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState('polling');

  const pusherKey = import.meta.env.VITE_PUSHER_KEY || realtimeConfig?.key || '';
  const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || realtimeConfig?.cluster || 'ap2';

  useEffect(() => {
    if (!workspaceId) return undefined;

    if (!pusherKey) {
      setMode('polling');
      setIsConnected(false);
      setRealtimeSocketId(null);
      if (currentUser) {
        setOnlineMembers([
          {
            id: String(currentUser.id),
            name: currentUser.name,
            email: currentUser.email,
          },
        ]);
      }
      return undefined;
    }

    setMode('pusher');

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      channelAuthorization: {
        endpoint: '/api/realtime/auth',
        transport: 'ajax',
      },
    });

    const handleConnected = () => {
      setIsConnected(true);
      setRealtimeSocketId(pusher.connection.socket_id);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setRealtimeSocketId(null);
    };

    pusher.connection.bind('connected', handleConnected);
    pusher.connection.bind('disconnected', handleDisconnected);
    pusher.connection.bind('error', handleDisconnected);

    const channelName = `presence-workspace-${workspaceId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('pusher:subscription_succeeded', (members) => {
      const list = [];
      members.each((member) => {
        list.push({
          id: String(member.id),
          name: member.info?.name || 'Member',
          email: member.info?.email || '',
        });
      });
      setOnlineMembers(list);
      setIsConnected(true);
      setRealtimeSocketId(pusher.connection.socket_id);
    });

    channel.bind('pusher:member_added', (member) => {
      setOnlineMembers((prev) => {
        const exists = prev.some((m) => String(m.id) === String(member.id));
        if (exists) return prev;
        return [
          ...prev,
          {
            id: String(member.id),
            name: member.info?.name || 'Member',
            email: member.info?.email || '',
          },
        ];
      });
    });

    channel.bind('pusher:member_removed', (member) => {
      setOnlineMembers((prev) => prev.filter((m) => String(m.id) !== String(member.id)));
    });

    const invalidateWorkspaceData = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['stats', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['activity', workspaceId] });
    };

    channel.bind('task.created', (newTask) => {
      if (newTask && newTask.id) {
        queryClient.setQueriesData({ queryKey: ['tasks', workspaceId] }, (oldData) => {
          if (!oldData || !Array.isArray(oldData.tasks)) return oldData;
          if (oldData.tasks.some((t) => Number(t.id) === Number(newTask.id))) return oldData;
          return {
            ...oldData,
            tasks: [newTask, ...oldData.tasks],
            total: (oldData.total || 0) + 1,
          };
        });
      }
      invalidateWorkspaceData();
    });

    channel.bind('tasks.bulkCreated', () => {
      invalidateWorkspaceData();
    });

    channel.bind('task.updated', (updatedTask) => {
      if (updatedTask && updatedTask.id) {
        queryClient.setQueriesData({ queryKey: ['tasks', workspaceId] }, (oldData) => {
          if (!oldData || !Array.isArray(oldData.tasks)) return oldData;
          return {
            ...oldData,
            tasks: oldData.tasks.map((t) =>
              Number(t.id) === Number(updatedTask.id) ? { ...t, ...updatedTask } : t
            ),
          };
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['stats', workspaceId] });
    });

    channel.bind('task.deleted', (payload) => {
      const deletedId = payload?.id;
      if (deletedId) {
        queryClient.setQueriesData({ queryKey: ['tasks', workspaceId] }, (oldData) => {
          if (!oldData || !Array.isArray(oldData.tasks)) return oldData;
          return {
            ...oldData,
            tasks: oldData.tasks.filter((t) => Number(t.id) !== Number(deletedId)),
            total: Math.max(0, (oldData.total || 1) - 1),
          };
        });
      }
      invalidateWorkspaceData();
    });

    channel.bind('activity.new', (newActivity) => {
      if (newActivity && newActivity.id) {
        queryClient.setQueryData(['activity', workspaceId], (oldData) => {
          if (!oldData || !Array.isArray(oldData.activities)) return oldData;
          if (oldData.activities.some((a) => Number(a.id) === Number(newActivity.id))) {
            return oldData;
          }
          return {
            ...oldData,
            activities: [newActivity, ...oldData.activities],
          };
        });
      }
      queryClient.invalidateQueries({ queryKey: ['activity', workspaceId] });
    });

    return () => {
      setRealtimeSocketId(null);
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [workspaceId, pusherKey, pusherCluster, queryClient, currentUser]);

  return {
    onlineMembers,
    isConnected,
    mode,
  };
}
