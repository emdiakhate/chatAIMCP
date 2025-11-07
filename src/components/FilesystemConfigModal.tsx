import React, { useState, useEffect } from 'react';
import { X, Folder, Plus, Trash2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface FilesystemConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: any;
  onConfigUpdated: () => void;
}

export const FilesystemConfigModal: React.FC<FilesystemConfigModalProps> = ({
  isOpen,
  onClose,
  connection,
  onConfigUpdated,
}) => {
  const [allowedPaths, setAllowedPaths] = useState<string[]>([]);
  const [newPath, setNewPath] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && connection) {
      // Charger la configuration actuelle depuis config_overrides
      const configOverrides = connection.config_overrides || {};
      if (configOverrides.allowedPath) {
        // Si c'est une chaîne, la convertir en tableau
        const paths = typeof configOverrides.allowedPath === 'string'
          ? [configOverrides.allowedPath]
          : Array.isArray(configOverrides.allowedPath)
          ? configOverrides.allowedPath
          : [];
        setAllowedPaths(paths);
      } else {
        // Aucun chemin configuré
        setAllowedPaths([]);
      }
      setNewPath('');
      setError(null);
    } else if (!isOpen) {
      // Réinitialiser quand le modal est fermé
      setAllowedPaths([]);
      setNewPath('');
      setError(null);
    }
  }, [isOpen, connection]);

  const handleAddPath = () => {
    if (!newPath.trim()) return;
    
    // Valider que le chemin n'existe pas déjà
    if (allowedPaths.includes(newPath.trim())) {
      setError('Ce chemin est déjà ajouté');
      return;
    }

    setAllowedPaths([...allowedPaths, newPath.trim()]);
    setNewPath('');
    setError(null);
  };

  const handleRemovePath = (index: number) => {
    setAllowedPaths(allowedPaths.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (allowedPaths.length === 0) {
      setError('Veuillez ajouter au moins un chemin');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Mettre à jour la connexion avec les nouveaux chemins
      // Toujours envoyer comme tableau pour être cohérent
      const configOverrides = {
        allowedPath: allowedPaths,
      };

      // Utiliser l'API pour mettre à jour la connexion
      // On va déconnecter et reconnecter avec la nouvelle config
      await api.deleteMCPConnection(connection.id);
      await api.createMCPConnection(connection.server_id, undefined, configOverrides);
      
      onConfigUpdated();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Configurer Local Files</h2>
            <p className="text-sm text-gray-600 mt-1">
              Choisissez les dossiers auxquels l'IA aura accès
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Liste des chemins autorisés */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dossiers autorisés
            </label>
            {allowedPaths.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun dossier configuré</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allowedPaths.map((path, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <Folder className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-900 truncate">{path}</p>
                    </div>
                    <button
                      onClick={() => handleRemovePath(index)}
                      className="p-1.5 hover:bg-red-100 rounded text-red-600 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ajouter un nouveau chemin */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ajouter un dossier
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddPath();
                  }
                }}
                placeholder="/Users/malick/Downloads"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <button
                onClick={handleAddPath}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Entrez le chemin absolu du dossier (ex: /Users/malick/Downloads)
            </p>
          </div>

          {/* Exemples */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">Exemples de chemins :</p>
            <ul className="text-xs text-blue-700 space-y-1 font-mono">
              <li>• /Users/malick/Downloads</li>
              <li>• /Users/malick/Documents</li>
              <li>• /Users/malick/Desktop</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || allowedPaths.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

