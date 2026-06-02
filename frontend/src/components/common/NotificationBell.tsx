import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';

import apiClient from '../../services/api/client';

export const NotificationBell: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['notifications', user?._id],
    queryFn: () => apiClient.get('/notifications').then(res => res.data.data.notifications),
    enabled: !!user?._id,
    refetchInterval: 15000,
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?._id] })
  });

  if (!user) return null;

  const notifications = data || [];
  const unreadCount = notifications.filter((n: any) => n.status === 'pending').length;

  return (
    <div className="relative">
      <div className="relative">
        {isOpen && (
          <div className="absolute top-10 right-0 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[100]">
            <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
              <h3 className="font-semibold text-sm text-slate-800 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">{unreadCount} new</span>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No notifications yet.</div>
              ) : (
                notifications.map((n: any) => (
                  <div 
                    key={n._id} 
                    onClick={() => markAsRead.mutate(n._id)}
                    className={`p-4 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${n.status === 'pending' ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-0.5">{n.subject || 'Notification'}</p>
                        {n.body && <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{n.body}</p>}
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        {n.status === 'pending' && (
                          <div className="w-2 h-2 bg-primary-500 rounded-full" title="New" />
                        )}
                        <CheckCircle className="w-4 h-4 text-slate-300 hover:text-emerald-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border border-white dark:border-slate-900 rounded-full"></span>
          )}
        </button>
      </div>
    </div>
  );
};
