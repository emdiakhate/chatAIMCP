import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Activity,
  Zap,
  Clock,
  BarChart3,
  PieChart,
  X,
  Loader2
} from 'lucide-react';
import { api } from '../../lib/api';

interface UsageStats {
  period: string;
  overall: {
    total_requests: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_tokens: number;
    total_cost: number;
  };
  byProvider: Array<{
    provider: string;
    requests: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    total_cost: number;
  }>;
  byModel: Array<{
    provider: string;
    model: string;
    requests: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    total_cost: number;
    avg_cost_per_request: number;
  }>;
  daily: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

export const LLMDashboard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('30d');
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, period]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await api.getLLMUsageStats(period);
      if (response.success) {
        setStats(response);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => {
    return cost < 0.01 ? cost.toFixed(6) : cost.toFixed(4);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getPeriodLabel = () => {
    switch (period) {
      case '24h': return 'Dernières 24 heures';
      case '7d': return '7 derniers jours';
      case '30d': return '30 derniers jours';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <BarChart3 className="w-4 h-4" />
        <span>Statistiques & Coûts</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-[#CC785C]" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Statistiques & Monitoring</h2>
                <p className="text-sm text-gray-500">{getPeriodLabel()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Period Selector */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['24h', '7d', '30d'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      period === p
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {p === '24h' ? '24h' : p === '7d' ? '7j' : '30j'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#CC785C] animate-spin" />
          </div>
        ) : stats ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {stats.overall.total_requests || 0}
                  </div>
                  <div className="text-sm text-blue-700">Requêtes totales</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatNumber(stats.overall.total_tokens || 0)}
                  </div>
                  <div className="text-sm text-green-700">Tokens utilisés</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    ${formatCost(stats.overall.total_cost || 0)}
                  </div>
                  <div className="text-sm text-purple-700">Coût total</div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-amber-500 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-amber-900">
                    ${stats.overall.total_requests > 0
                      ? formatCost(stats.overall.total_cost / stats.overall.total_requests)
                      : '0.00'
                    }
                  </div>
                  <div className="text-sm text-amber-700">Coût moyen/req</div>
                </div>
              </div>

              {/* Provider Breakdown */}
              {stats.byProvider.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <PieChart className="w-4 h-4" />
                      Utilisation par Fournisseur
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {stats.byProvider.map((provider) => {
                        const percentage = stats.overall.total_cost > 0
                          ? (provider.total_cost / stats.overall.total_cost) * 100
                          : 0;
                        return (
                          <div key={provider.provider} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 capitalize">
                                  {provider.provider}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({provider.requests} req)
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-900">
                                  ${formatCost(provider.total_cost)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {percentage.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[#CC785C] h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Model Breakdown */}
              {stats.byModel.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Détails par Modèle
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Modèle</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Requêtes</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Tokens</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Coût Total</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Coût/Req</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {stats.byModel.map((model, idx) => (
                          <tr key={`${model.provider}-${model.model}-${idx}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{model.model}</div>
                                <div className="text-xs text-gray-500 capitalize">{model.provider}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-900">
                              {model.requests}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-900">
                              {formatNumber(model.total_tokens)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                ${formatCost(model.total_cost)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              ${formatCost(model.avg_cost_per_request)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Daily Activity */}
              {stats.daily.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Activité Quotidienne
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      {stats.daily.map((day) => {
                        const maxCost = Math.max(...stats.daily.map(d => d.cost));
                        const percentage = maxCost > 0 ? (day.cost / maxCost) * 100 : 0;
                        return (
                          <div key={day.date} className="flex items-center gap-3">
                            <div className="text-xs text-gray-600 w-24">
                              {new Date(day.date).toLocaleDateString('fr-FR', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="flex-1">
                              <div className="w-full bg-gray-200 rounded-full h-6 relative">
                                <div
                                  className="bg-[#CC785C] h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                                  style={{ width: `${percentage}%` }}
                                >
                                  {percentage > 20 && (
                                    <span className="text-xs font-medium text-white">
                                      ${formatCost(day.cost)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 w-16 text-right">
                              {day.requests} req
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* No Data Message */}
              {stats.overall.total_requests === 0 && (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée disponible</h3>
                  <p className="text-sm text-gray-500">
                    Les statistiques d'utilisation apparaîtront ici après vos premières requêtes.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Erreur lors du chargement des statistiques</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
