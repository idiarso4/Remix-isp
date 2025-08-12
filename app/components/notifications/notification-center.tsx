import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { 
  Bell, 
  Check, 
  X, 
  Ticket, 
  UserPlus, 
  AlertTriangle,
  Settings,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "~/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  sentAt?: string;
}

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  const notificationsFetcher = useFetcher();
  const updateFetcher = useFetcher();

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Load notifications when opened
  useEffect(() => {
    if (isOpen && isHydrated) {
      notificationsFetcher.load("/api/notifications?limit=10");
    }
  }, [isOpen]);

  // Update notifications when data is loaded
  useEffect(() => {
    if (notificationsFetcher.data && typeof notificationsFetcher.data === 'object' && 'notifications' in notificationsFetcher.data) {
      setNotifications(notificationsFetcher.data.notifications as Notification[]);
      if ('unreadCount' in notificationsFetcher.data) {
        setUnreadCount(notificationsFetcher.data.unreadCount as number);
      }
    }
  }, [notificationsFetcher.data]);

  // Handle notification update completion
  useEffect(() => {
    if (updateFetcher.data && typeof updateFetcher.data === 'object' && 'success' in updateFetcher.data && updateFetcher.data.success) {
      // Refresh notifications
      notificationsFetcher.load("/api/notifications?limit=10");
    }
  }, [updateFetcher.data]);

  const markAsRead = (notificationId: string) => {
    const formData = new FormData();
    formData.append("id", notificationId);
    formData.append("status", "SENT");

    updateFetcher.submit(formData, {
      method: "PUT",
      action: "/api/notifications"
    });
  };

  const deleteNotification = (notificationId: string) => {
    const formData = new FormData();
    formData.append("id", notificationId);

    updateFetcher.submit(formData, {
      method: "DELETE",
      action: "/api/notifications"
    });
  };

  const markAllAsRead = () => {
    const unreadNotifications = notifications.filter(n => n.status === 'PENDING');
    unreadNotifications.forEach(notification => {
      markAsRead(notification.id);
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TICKET_UPDATE': return <Ticket className="h-4 w-4" />;
      case 'ASSIGNMENT': return <UserPlus className="h-4 w-4" />;
      case 'ESCALATION': return <AlertTriangle className="h-4 w-4" />;
      case 'SYSTEM_ALERT': return <Settings className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'TICKET_UPDATE': return 'text-blue-500';
      case 'ASSIGNMENT': return 'text-green-500';
      case 'ESCALATION': return 'text-red-500';
      case 'SYSTEM_ALERT': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const isLoading = notificationsFetcher.state === "loading";
  const isUpdating = updateFetcher.state === "submitting";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className={cn("relative inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3", className)}
      >
          <Bell className="h-5 w-5" />
          {isHydrated && unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={isUpdating}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-gray-50 transition-colors",
                    notification.status === 'PENDING' && "bg-blue-50"
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <div className={cn("mt-1", getNotificationColor(notification.type))}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm",
                            notification.status === 'PENDING' ? "font-semibold text-gray-900" : "text-gray-700"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: id
                            })}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          {notification.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              disabled={isUpdating}
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            disabled={isUpdating}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t border-gray-200 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setIsOpen(false);
                // Navigate to full notifications page
                window.location.href = '/notifications';
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}