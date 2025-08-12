import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { DataTable, type Column } from "~/components/tables/data-table";
import { 
  Bell, 
  Check, 
  X, 
  Ticket, 
  UserPlus, 
  AlertTriangle,
  Settings,
  Filter,
  RefreshCw,
  CheckCircle,
  Mail,
  MessageSquare,
  Smartphone
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  status: string;
  createdAt: string;
  sentAt?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  return json({ user });
}

export default function NotificationsPage() {
  const { user } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20
  });
  const [unreadCount, setUnreadCount] = useState(0);

  const notificationsFetcher = useFetcher();
  const updateFetcher = useFetcher();

  const status = searchParams.get("status") || "all";
  const type = searchParams.get("type") || "all";
  const page = parseInt(searchParams.get("page") || "1");

  // Load notifications
  const loadNotifications = (pageNum = page) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    params.set("limit", pagination.limit.toString());
    if (status !== "all") params.set("status", status);
    if (type !== "all") params.set("type", type);

    notificationsFetcher.load(`/api/notifications?${params.toString()}`);
  };

  // Initial load and when filters change
  useEffect(() => {
    loadNotifications();
  }, [status, type]);

  // Update notifications when data is loaded
  useEffect(() => {
    if (notificationsFetcher.data && typeof notificationsFetcher.data === 'object' && 'notifications' in notificationsFetcher.data) {
      setNotifications(notificationsFetcher.data.notifications as Notification[]);
      if ('pagination' in notificationsFetcher.data) {
        setPagination(notificationsFetcher.data.pagination as any);
      }
      if ('unreadCount' in notificationsFetcher.data) {
        setUnreadCount(notificationsFetcher.data.unreadCount as number);
      }
    }
  }, [notificationsFetcher.data]);

  // Handle update completion
  useEffect(() => {
    if (updateFetcher.data && typeof updateFetcher.data === 'object' && 'success' in updateFetcher.data && updateFetcher.data.success) {
      loadNotifications(pagination.currentPage);
    }
  }, [updateFetcher.data]);

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === "all") {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.delete("page"); // Reset to first page
    setSearchParams(newParams);
  };

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

  const refreshData = () => {
    loadNotifications(pagination.currentPage);
  };

  const isLoading = notificationsFetcher.state === "loading";
  const isUpdating = updateFetcher.state === "submitting";

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TICKET_UPDATE': return <Ticket className="h-4 w-4 text-blue-500" />;
      case 'ASSIGNMENT': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'ESCALATION': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'SYSTEM_ALERT': return <Settings className="h-4 w-4 text-yellow-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL': return <Mail className="h-4 w-4" />;
      case 'SMS': return <Smartphone className="h-4 w-4" />;
      case 'IN_APP': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700">Unread</Badge>;
      case 'SENT':
        return <Badge className="bg-green-100 text-green-700">Read</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Table columns
  const columns: Column<Notification>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (notification) => (
        <div className="flex items-center space-x-2">
          {getNotificationIcon(notification.type)}
          <span className="text-sm font-medium">
            {notification.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </div>
      )
    },
    {
      key: 'title',
      header: 'Notification',
      render: (notification) => (
        <div className={notification.status === 'PENDING' ? 'font-semibold' : ''}>
          <div className="text-sm text-gray-900">{notification.title}</div>
          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
            {notification.message}
          </div>
        </div>
      )
    },
    {
      key: 'channel',
      header: 'Channel',
      render: (notification) => (
        <div className="flex items-center space-x-1">
          {getChannelIcon(notification.channel)}
          <span className="text-sm">{notification.channel}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (notification) => getStatusBadge(notification.status)
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (notification) => (
        <div className="text-sm text-gray-500">
          {format(new Date(notification.createdAt), "dd MMM yyyy, HH:mm", { locale: id })}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (notification) => (
        <div className="flex items-center space-x-2">
          {notification.status === 'PENDING' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAsRead(notification.id)}
              disabled={isUpdating}
              className="text-green-600 hover:text-green-700"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteNotification(notification.id)}
            disabled={isUpdating}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <PageContainer className="py-8">
      <PageHeader
        title="Notifications"
        description="Manage your notifications and alerts"
      >
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={markAllAsRead}
              disabled={isUpdating}
              className="flex items-center"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read ({unreadCount})
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Unread</option>
            <option value="sent">Read</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        
        <select
          value={type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="ticket_update">Ticket Updates</option>
          <option value="assignment">Assignments</option>
          <option value="escalation">Escalations</option>
          <option value="system_alert">System Alerts</option>
        </select>
      </div>

      {/* Notifications Table */}
      <DataTable
        data={notifications}
        columns={columns}
        loading={isLoading}
        emptyMessage="No notifications found"
        pagination={{
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          pageSize: pagination.limit,
          totalItems: pagination.totalCount,
          onPageChange: (page) => {
            const newParams = new URLSearchParams(searchParams);
            newParams.set("page", page.toString());
            setSearchParams(newParams);
            loadNotifications(page);
          }
        }}
      />
    </PageContainer>
  );
}