import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, ExternalLink } from 'lucide-react';
import { Message, Source } from '../pages/ChatPage';
import { ToolCallIndicator } from './ToolCallIndicator';
import { FilePreview } from './FilePreview';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {messages.map((message) => {
        let sources: Source[] = [];
        let toolCalls: any[] = [];

        // Parse sources - peut être un tableau de sources ou un tableau de tool calls
        if (message.sources) {
          try {
            // Si c'est déjà un objet, l'utiliser directement, sinon parser
            let parsed;
            if (typeof message.sources === 'string') {
              parsed = JSON.parse(message.sources);
            } else {
              parsed = message.sources;
            }
            
            // Vérifier si c'est des tool calls (ont une propriété 'tool')
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].tool) {
              toolCalls = parsed;
            } else if (Array.isArray(parsed)) {
              sources = parsed;
            }
          } catch (e) {
            console.error('Error parsing sources:', e);
          }
        }

        return (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[80%] ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-orange-500 ml-3'
                    : 'bg-gray-200 dark:bg-gray-700 mr-3'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                )}
              </div>

              <div className="flex-1">
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          code: ({ children }) => (
                            <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">{children}</code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto my-2">{children}</pre>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>

                {/* Tool Calls Indicators */}
                {message.role === 'assistant' && toolCalls.length > 0 && (
                  <ToolCallIndicator toolCalls={toolCalls} />
                )}

                {/* File Previews - Render files that were read */}
                {message.role === 'assistant' && toolCalls.length > 0 && (
                  <>
                    {toolCalls
                      .filter(tc => tc.fileData)
                      .map((tc, idx) => (
                        <div key={idx} className="mt-3">
                          <FilePreview
                            fileName={tc.fileData.fileName}
                            fileType={tc.fileData.fileType}
                            content={tc.fileData.content}
                            metadata={tc.fileData.metadata}
                            downloadUrl={tc.fileData.downloadUrl}
                          />
                        </div>
                      ))}
                  </>
                )}

                {/* Sources */}
                {sources.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Sources:</p>
                    <div className="space-y-2">
                      {sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-orange-300 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400">
                              {source.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {source.type === 'drive' ? 'Google Drive' : 'Gmail'}
                              {source.from && ` • ${source.from}`}
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-500 ml-2 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
