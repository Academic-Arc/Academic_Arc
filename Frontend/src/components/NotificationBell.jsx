import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import './NotificationBell.css';

function NotificationBell({ theme = 'light' }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const notificationRef = useRef(null);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setNotifications([]);
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
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

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

        setNotifications((prevNotifications) =>
          prevNotifications.map((item) =>
            item.id === notification.id
              ? { ...item, is_read: true }
              : item
          )
        );
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