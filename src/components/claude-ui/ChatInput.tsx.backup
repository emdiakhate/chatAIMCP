import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, ChevronDown, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

interface ChatInputProps {
  onSend: (content: string, selectedModel?: { provider: string; model: string }) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface Model {
  id: string;
  provider: string;
  name: string;
  cost: { input: number; output: number };
  quality: string;
  useCase: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Envoyer un message...',
}) => {
  const [value, setValue] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [availableModels, setAvailableModels] = useState<{ groq: Model[]; openrouter: Model[] }>({ groq: [], openrouter: [] });
  const [selectedModel, setSelectedModel] = useState<{ provider: string; model: string; name: string } | null>(null);
  const [defaultProvider, setDefaultProvider] = useState('groq');
  const [defaultModel, setDefaultModel] = useState('llama-3.1-70b');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  // Load available models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await api.getLLMModels();
        if (response.success) {
          setAvailableModels(response.models);
          setDefaultProvider(response.defaultProvider);
          setDefaultModel(response.defaultModel);

          // Set initial selected model
          const allModels = [...response.models.groq, ...response.models.openrouter];
          const defaultModelObj = allModels.find(
            m => m.provider === response.defaultProvider && m.id === response.defaultModel
          );
          if (defaultModelObj) {
            setSelectedModel({
              provider: defaultModelObj.provider,
              model: defaultModelObj.id,
              name: defaultModelObj.name
            });
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };
    loadModels();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Close model selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };

    if (showModelSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelSelector]);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;

    onSend(value.trim(), selectedModel || undefined);
    setValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleModelSelect = (provider: string, modelId: string, modelName: string) => {
    setSelectedModel({ provider, model: modelId, name: modelName });
    setShowModelSelector(false);
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
      <div className="flex flex-col gap-2">
        {/* Model Selector */}
        <div className="relative" ref={modelSelectorRef}>
          <button
            type="button"
            onClick={() => setShowModelSelector(!showModelSelector)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 text-[#CC785C]" />
            <span className="font-medium text-gray-700">
              {selectedModel?.name || 'Sélectionner un modèle'}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
          </button>

          {/* Model Dropdown */}
          {showModelSelector && (
            <div className="absolute bottom-full left-0 mb-2 w-96 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden z-50">
              <div className="max-h-96 overflow-y-auto">
                {/* Groq Models */}
                {availableModels.groq.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-xs font-semibold text-gray-600 uppercase">Groq (Rapide & Économique)</h3>
                    </div>
                    {availableModels.groq.map((model) => (
                      <button
                        key={`${model.provider}-${model.id}`}
                        onClick={() => handleModelSelect(model.provider, model.id, model.name)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                          selectedModel?.model === model.id ? 'bg-[#CC785C]/10' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{model.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{model.useCase}</div>
                          </div>
                          <div className="text-right ml-2">
                            <div className="text-xs text-gray-600">
                              ${(model.cost.input * 1000).toFixed(3)}/M
                            </div>
                            <div className="text-xs text-gray-400">entrée</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* OpenRouter Models */}
                {availableModels.openrouter.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-xs font-semibold text-gray-600 uppercase">OpenRouter (Premium)</h3>
                    </div>
                    {availableModels.openrouter.map((model) => (
                      <button
                        key={`${model.provider}-${model.id}`}
                        onClick={() => handleModelSelect(model.provider, model.id, model.name)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                          selectedModel?.model === model.id ? 'bg-[#CC785C]/10' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{model.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{model.useCase}</div>
                          </div>
                          <div className="text-right ml-2">
                            <div className="text-xs text-gray-600">
                              ${(model.cost.input * 1000).toFixed(3)}/M
                            </div>
                            <div className="text-xs text-gray-400">entrée</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
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
        <div className="text-xs text-gray-500 text-center">
          Appuyez sur <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">Entrée</kbd> pour envoyer,{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">Maj</kbd> +{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">Entrée</kbd> pour une nouvelle ligne
        </div>
      </div>
    </div>
  );
};
