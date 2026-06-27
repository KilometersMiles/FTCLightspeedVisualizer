import { useEffect, useState } from 'react';

function NotificationManager({ notifications, setNotifications }) {
    return (
        <div className="NotificationManager">
            {notifications?.map((notification) => (
                <Notification 
                    key={notification.time} 
                    notification={notification} 
                    setNotifications={setNotifications}
                />
            ))}
        </div>
    );
}

function Notification({ notification, setNotifications }) {
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            setNotifications(prevItems => prevItems.filter(item => item.time !== notification.time));
        }, 200);
    };

    useEffect(() => {
        const autoDismissTimer = setTimeout(() => {
            handleClose();
        }, notification.duration || 4000);

        return () => clearTimeout(autoDismissTimer);
    }, [notification]);

    return (
        <div className={`notification-card ${notification.type || 'info'} ${isExiting ? 'fade-out' : ''}`}>
            <div className="notification-header">
                <span className="notification-title">{notification.title || 'Status'}</span>
                <button className="notification-close-btn" onClick={handleClose}>✕</button>
            </div>
            <div className="notification-message">
                {notification.message}
            </div>
            <div 
                className="notification-progress-bar" 
                style={{ animationDuration: `${notification.duration || 4000}ms` }}
            />
        </div>
    );
}

export default NotificationManager;