'use client';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { selectUser } from '../../store/slices/authSlice';

interface Notification {
  id: number;
  body: string;
  time: string;
  isNew: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1, body: '9 leave approvals pending', time: '2 min ago', isNew: true },
  { id: 2, body: 'Rajesh Kumar FNF needs review', time: '15 min ago', isNew: true },
  { id: 3, body: '3 offer letters awaiting sign-off', time: '1 hr ago', isNew: true },
  { id: 4, body: 'Laptop recovery overdue', time: '2 hr ago', isNew: true },
  { id: 5, body: "Today is Sunita Rao's birthday! 🎉", time: 'Today', isNew: false },
  { id: 6, body: 'Q1 KRA cycle closes in 27 days', time: 'Reminder', isNew: false },
];

const ROLE_BADGE: Record<string, string> = {
  hr: 'rb-hr',
  admin: 'rb-admin',
  mgr: 'rb-mgr',
  emp: 'rb-emp',
};

const ROLE_LABEL: Record<string, string> = {
  hr: 'HR Manager',
  admin: 'Admin',
  mgr: 'Manager',
  emp: 'Employee',
};

interface TopbarProps {
  onAddNew?: () => void;
}

export function Topbar({ onAddNew }: TopbarProps) {
  const dispatch = useAppDispatch();
  const { pageTitle, breadcrumb } = useAppSelector((s) => s.ui);
  const user = useAppSelector(selectUser);
  const [notifOpen, setNotifOpen] = useState(false);

  const role = user?.roleSlug || 'hr';
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => n.isNew).length;

  return (
    <div id="topbar">
      <button className="tb-tog" onClick={() => dispatch(toggleSidebar())}>☰</button>

      <div id="tb-ttl">
        {pageTitle}
        {breadcrumb && <span className="tb-bc"> / {breadcrumb}</span>}
      </div>

      <div className="tb-r">
        <div className={`rb ${ROLE_BADGE[role]}`}>{ROLE_LABEL[role]}</div>
        <button className="btn btn-sec btn-sm">↓ Export</button>
        {onAddNew && (
          <button className="btn btn-pri btn-sm" onClick={onAddNew}>+ Add New</button>
        )}

        {/* Notifications */}
        <div className="notif-wrap">
          <div
            className="notif-btn"
            onClick={(e) => { e.stopPropagation(); setNotifOpen((o) => !o); }}
          >
            🔔
            {unreadCount > 0 && <div className="n-dot" />}
          </div>
          <div className={`notif-drop${notifOpen ? ' open' : ''}`}>
            <div className="nd-hd">
              Notifications
              <span className="chip cr">{unreadCount} new</span>
            </div>
            {MOCK_NOTIFICATIONS.map((n) => (
              <div key={n.id} className="nd-item">
                {n.isNew && <div className="nd-new" />}
                <div>
                  <div className="nd-body">{n.body}</div>
                  <div className="nd-time">{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}