import React from 'react';
import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FilePreview } from '../FilePreview';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  tool_calls?: any[];
}

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const toolCalls = message.tool_calls || [];

  return (
    <div className={`flex gap-4 py-6 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-[#CC785C]' : 'bg-gray-200'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-gray-700" />
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-sm font-semibold text-gray-900">
            {isUser ? 'Vous' : 'Claude'}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(message.created_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Message Text */}
        <div
          className={`prose prose-sm max-w-none ${
            isUser
              ? 'bg-white rounded-2xl px-4 py-3 inline-block ml-auto'
              : ''
          }`}
        >
          {isUser ? (
            <p className="text-gray-900 whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-lg my-2"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      className="bg-gray-100 text-[#CC785C] px-1.5 py-0.5 rounded text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return <p className="text-gray-900 leading-7 mb-4">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>;
                },
                li({ children }) {
                  return <li className="text-gray-900">{children}</li>;
                },
                h1({ children }) {
                  return <h1 className="text-2xl font-bold mb-4 text-gray-900">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="text-xl font-bold mb-3 text-gray-900">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-lg font-bold mb-2 text-gray-900">{children}</h3>;
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-[#CC785C] pl-4 italic text-gray-700 my-4">
                      {children}
                    </blockquote>
                  );
                },
                a({ children, href }) {
                  return (
                    <a
                      href={href}
                      className="text-[#CC785C] hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Tool Calls / File Previews */}
        {!isUser && toolCalls.length > 0 && (
          <div className="mt-4 space-y-3">
            {toolCalls
              .filter((tc) => tc.fileData)
              .map((tc, idx) => (
                <FilePreview
                  key={idx}
                  fileName={tc.fileData.fileName}
                  fileType={tc.fileData.fileType}
                  content={tc.fileData.content}
                  metadata={tc.fileData.metadata}
                  downloadUrl={tc.fileData.downloadUrl}
                />
              ))}

            {/* Other tool calls (non-file) */}
            {toolCalls.filter((tc) => !tc.fileData && tc.name).length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Outils utilisés
                </div>
                <div className="space-y-2">
                  {toolCalls
                    .filter((tc) => !tc.fileData && tc.name)
                    .map((tc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <div className="w-2 h-2 bg-[#CC785C] rounded-full" />
                        <span className="font-medium">{tc.name}</span>
                        {tc.arguments && (
                          <span className="text-gray-500 text-xs truncate">
                            {JSON.stringify(tc.arguments)}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
