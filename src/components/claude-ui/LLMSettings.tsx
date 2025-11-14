import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Check, X, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface Model {
  id: string;
  provider: string;
  name: string;
  cost: { input: number; output: number };
  quality: string;
  useCase: string;
  contextWindow: number;
}

export const LLMSettings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableModels, setAvailableModels] = useState<{ groq: Model[]; openrouter: Model[] }>({ groq: [], openrouter: [] });
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [selectedModel, setSelectedModel] = useState('llama-3.1-70b');
  const [settings, setSettings] = useState({
    temperature: 0.7,
    maxTokens: 2000,
    enableFallback: true
  });
  const [configured, setConfigured] = useState({ groq: false, openrouter: false });

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const [modelsResponse, preferencesResponse] = await Promise.all([
        api.getLLMModels(),
        api.getLLMPreferences()
      ]);

      if (modelsResponse.success) {
        setAvailableModels(modelsResponse.models);
        setConfigured(modelsResponse.configured);
      }

      if (preferencesResponse.success) {
        setSelectedProvider(preferencesResponse.preferences.provider);
        setSelectedModel(preferencesResponse.preferences.model);
        setSettings(preferencesResponse.preferences.settings);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateLLMPreferences(selectedProvider, selectedModel, settings);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Erreur lors de la sauvegarde des préférences');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span>Configuration LLM</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-[#CC785C]" />
            <h2 className="text-xl font-semibold text-gray-900">Configuration des Modèles LLM</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#CC785C] animate-spin" />
          </div>
        ) : (
          <>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Provider Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">État des Fournisseurs</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Groq</span>
                      {configured.groq ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <Check className="w-3 h-3" />
                          Configuré
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600">Non configuré</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">OpenRouter</span>
                      {configured.openrouter ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <Check className="w-3 h-3" />
                          Configuré
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600">Non configuré</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Model Selection */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Modèle par Défaut</h3>

                  {/* Groq Models */}
                  {availableModels.groq.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Groq</h4>
                      <div className="space-y-2">
                        {availableModels.groq.map((model) => (
                          <label
                            key={model.id}
                            className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedProvider === model.provider && selectedModel === model.id
                                ? 'border-[#CC785C] bg-[#CC785C]/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="model"
                              value={model.id}
                              checked={selectedProvider === model.provider && selectedModel === model.id}
                              onChange={() => {
                                setSelectedProvider(model.provider);
                                setSelectedModel(model.id);
                              }}
                              className="mt-1 text-[#CC785C] focus:ring-[#CC785C]"
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">{model.name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{model.useCase}</div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    Contexte: {(model.contextWindow / 1000).toFixed(0)}K tokens
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="text-xs font-medium text-gray-700">
                                    ${(model.cost.input * 1000).toFixed(3)}/M
                                  </div>
                                  <div className="text-xs text-gray-400">entrée</div>
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* OpenRouter Models */}
                  {availableModels.openrouter.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">OpenRouter</h4>
                      <div className="space-y-2">
                        {availableModels.openrouter.map((model) => (
                          <label
                            key={model.id}
                            className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedProvider === model.provider && selectedModel === model.id
                                ? 'border-[#CC785C] bg-[#CC785C]/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="model"
                              value={model.id}
                              checked={selectedProvider === model.provider && selectedModel === model.id}
                              onChange={() => {
                                setSelectedProvider(model.provider);
                                setSelectedModel(model.id);
                              }}
                              className="mt-1 text-[#CC785C] focus:ring-[#CC785C]"
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">{model.name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{model.useCase}</div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    Contexte: {(model.contextWindow / 1000).toFixed(0)}K tokens
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="text-xs font-medium text-gray-700">
                                    ${(model.cost.input * 1000).toFixed(3)}/M
                                  </div>
                                  <div className="text-xs text-gray-400">entrée</div>
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Settings */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Paramètres Avancés</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">
                        Température: {settings.temperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.temperature}
                        onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Précis</span>
                        <span>Créatif</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-2">
                        Tokens Maximum: {settings.maxTokens}
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="4000"
                        step="100"
                        value={settings.maxTokens}
                        onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={settings.enableFallback}
                        onChange={(e) => setSettings({ ...settings, enableFallback: e.target.checked })}
                        className="text-[#CC785C] focus:ring-[#CC785C]"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Basculement automatique</div>
                        <div className="text-xs text-gray-500">
                          Basculer vers un autre fournisseur en cas d'erreur
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-[#CC785C] text-white rounded-lg hover:bg-[#B86A4D] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
