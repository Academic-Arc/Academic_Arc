import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import './NotificationBell.css';

function NotificationBell({
  theme = 'light',
  isOpen: controlledIsOpen,
  setIsOpen: controlledSetIsOpen,
  onUnreadCountChange,
}) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledSetIsOpen || setInternalIsOpen;

  const notificationRef = useRef(null);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setNotifications([]);
      if (onUnreadCountChange) onUnreadCountChange(0);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/notifications/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data);
      const count = Array.isArray(data)
        ? data.filter((item) => !item.is_read).length
        : 0;
      if (onUnreadCountChange) onUnreadCountChange(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 45000);
    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target) &&
        !event.target.closest('.navbar-profile-notif-btn')
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }

    setIsOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notification) => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      return;
    }

    // Mark as read if necessary
    if (!notification.is_read) {
      try {
        const response = await fetch(
          `${API_URL}/notifications/${notification.id}/read`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to mark notification as read');
        }

        setNotifications((prevNotifications) => {
          const updated = prevNotifications.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          );
          const newCount = updated.filter((item) => !item.is_read).length;
          if (onUnreadCountChange) onUnreadCountChange(newCount);
          return updated;
        });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Close the notification dropdown
    setIsOpen(false);

    // Open the related post from the Profile page
    if (notification.submission_id) {
      navigate('/profile', {
        state: {
          openSubmissionId: notification.submission_id,
        },
      });
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications((prev) => {
          const updated = prev.map((item) => ({ ...item, is_read: true }));
          if (onUnreadCountChange) onUnreadCountChange(0);
          return updated;
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <div
      className={`notification-wrapper notification-${theme}`}
      ref={notificationRef}
    >
      <button
        className="notification-button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <span className="notification-icon">
          <img src="/Icons/notification.svg" alt="" />
        </span>

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span>Notifications</span>
            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notification-mark-all"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </button>
              )}
              <button
                type="button"
                className="notification-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
              >
                ×
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="notification-empty">
              <p>No notifications yet.</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    !notification.is_read ? 'unread' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-item-title">
                    {notification.title}
                  </div>

                  <div className="notification-item-message">
                    {notification.message}
                  </div>

                  {!notification.is_read && (
                    <span className="notification-unread-dot" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
