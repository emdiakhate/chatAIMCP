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
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0];
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
      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition group"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={userName}
          className="w-10 h-10 rounded-full object-cover border-2 border-gray-300 group-hover:border-blue-500 transition"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold border-2 border-gray-300 group-hover:border-blue-500 transition">
          {getInitials(userName)}
        </div>
      )}
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-gray-900">{userName}</div>
        <div className="text-xs text-gray-500 truncate">{userEmail}</div>
      </div>
      <User className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition" />
    </button>
  );
};
