import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Envoyer un message...',
}) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;

    onSend(value.trim());
    setValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <div className="flex items-end gap-2 bg-white border border-gray-300 rounded-xl shadow-sm focus-within:border-[#CC785C] focus-within:ring-2 focus-within:ring-[#CC785C] focus-within:ring-opacity-20 transition-all">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 px-4 py-3 bg-transparent border-none outline-none resize-none max-h-[200px] text-gray-900 placeholder-gray-400 disabled:opacity-50"
          style={{ minHeight: '44px' }}
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={`p-3 m-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            value.trim() && !disabled
              ? 'bg-[#CC785C] text-white hover:bg-[#B86A4D]'
              : 'bg-gray-100 text-gray-400'
          }`}
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Helper text */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Appuyez sur <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">Entrée</kbd> pour envoyer,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">Maj</kbd> +{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">Entrée</kbd> pour une nouvelle ligne
      </div>
    </div>
  );
};
