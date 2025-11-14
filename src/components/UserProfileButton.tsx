import React from 'react';
import { User } from 'lucide-react';

interface UserProfileButtonProps {
  userEmail: string;
  onClick: () => void;
}

export const UserProfileButton: React.FC<UserProfileButtonProps> = ({
  userEmail,
  onClick,
}) => {
  const userName = localStorage.getItem('userName') || (userEmail ? userEmail.split('@')[0] : 'Utilisateur');
  const avatarUrl = localStorage.getItem('userAvatar') || '';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition group"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={userName}
          className="w-10 h-10 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 group-hover:border-sky-500 transition"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold border-2 border-gray-300 dark:border-gray-600 group-hover:border-sky-500 transition">
          {getInitials(userName)}
        </div>
      )}
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{userName}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail || 'No email'}</div>
      </div>
      <User className="w-4 h-4 text-gray-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition" />
    </button>
  );
};
