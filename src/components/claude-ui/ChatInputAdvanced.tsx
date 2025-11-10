import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Paperclip, X, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface ChatInputAdvancedProps {
  onSend: (content: string, attachedFiles?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  conversationId?: number | null;
}

export const ChatInputAdvanced: React.FC<ChatInputAdvancedProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Envoyer un message...',
  conversationId,
}) => {
  const [value, setValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
    setValue('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        await transcribeAudio(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', 'fr'); // ou détecter la langue

      const response = await fetch('http://localhost:3001/api/chat/speech-to-text', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transcription failed');
      }

      const data = await response.json();
      setValue((prev) => prev + (prev ? ' ' : '') + data.text);
      textareaRef.current?.focus();
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      if (error.message.includes('OpenAI API key')) {
        alert('Please configure your OpenAI API key in MCP Tools to use voice input.');
      } else {
        alert('Failed to transcribe audio: ' + error.message);
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  // File handling
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    setAttachedFiles((prev) => [...prev, ...files]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="relative">
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#CC785C] bg-opacity-10 border-2 border-dashed border-[#CC785C] rounded-2xl flex items-center justify-center z-10 pointer-events-none">
          <div className="text-[#CC785C] font-medium">
            Drop files here
          </div>
        </div>
      )}

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              <Paperclip className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700 font-medium">{file.name}</span>
              <span className="text-gray-500 text-xs">({formatFileSize(file.size)})</span>
              <button
                onClick={() => removeFile(index)}
                className="ml-1 text-gray-500 hover:text-red-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input container */}
      <div
        className={`bg-white rounded-2xl shadow-sm border transition-colors ${
          isDragging ? 'border-[#CC785C]' : 'border-gray-200'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-end gap-2 p-3">
          {/* File attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-[#CC785C] hover:bg-[#FFF8F5] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isTranscribing}
            className="flex-1 resize-none border-none outline-none text-gray-900 placeholder-gray-400 disabled:opacity-50 max-h-[200px]"
            rows={1}
            style={{ minHeight: '24px' }}
          />

          {/* Voice input button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isTranscribing}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording
                ? 'text-red-600 bg-red-50 hover:bg-red-100 animate-pulse'
                : 'text-gray-500 hover:text-[#CC785C] hover:bg-[#FFF8F5]'
            }`}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className="flex-shrink-0 p-2 bg-[#CC785C] text-white rounded-lg hover:bg-[#B86A4D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#CC785C]"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="px-3 pb-2 text-sm text-red-600 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            Recording... Click microphone to stop
          </div>
        )}

        {/* Transcribing indicator */}
        {isTranscribing && (
          <div className="px-3 pb-2 text-sm text-gray-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Transcribing audio...
          </div>
        )}

        {/* Hint text */}
        {!isRecording && !isTranscribing && (
          <div className="px-3 pb-2 text-xs text-gray-400">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> to send,
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600 ml-1">Shift+Enter</kbd> for new line
          </div>
        )}
      </div>
    </div>
  );
};
