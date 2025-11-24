import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import { Trophy, TrendingUp, Target, Award, ArrowLeft } from 'lucide-react';
import axios from 'axios';

function Statistics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [myStats, setMyStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mystats'); // 'mystats' or 'leaderboard'

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || '';

      // Fetch my stats
      const myStatsRes = await axios.get(`${API_URL}/api/statistics/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyStats(myStatsRes.data);

      // Fetch leaderboard
      const leaderboardRes = await axios.get(`${API_URL}/api/statistics/leaderboard?limit=100`);
      setLeaderboard(leaderboardRes.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-white/60';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue mx-auto mb-4"></div>
          <p className="text-white/70">{t('loadingStatistics')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-safe">
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-white/60 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            {t('back')}
          </button>
          <h1 className="text-3xl font-bold">{t('statistics')}</h1>
          <div className="w-20"></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('mystats')}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'mystats'
                ? 'bg-blue text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {t('myStats')}
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-blue text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {t('leaderboard')}
          </button>
        </div>

        {/* My Stats Tab */}
        {activeTab === 'mystats' && myStats && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card text-center">
                <Trophy className="mx-auto mb-2 text-yellow-400" size={32} />
                <div className="text-3xl font-bold text-blue">{myStats.games_won || 0}</div>
                <div className="text-sm text-white/60">{t('wins')}</div>
              </div>

              <div className="card text-center">
                <Target className="mx-auto mb-2 text-green" size={32} />
                <div className="text-3xl font-bold text-blue">{myStats.games_played || 0}</div>
                <div className="text-sm text-white/60">{t('gamesPlayed')}</div>
              </div>

              <div className="card text-center">
                <TrendingUp className="mx-auto mb-2 text-blue" size={32} />
                <div className="text-3xl font-bold text-blue">{myStats.win_rate || 0}%</div>
                <div className="text-sm text-white/60">{t('winRate')}</div>
              </div>

              <div className="card text-center">
                <Award className="mx-auto mb-2 text-purple-400" size={32} />
                <div className="text-3xl font-bold text-blue">{myStats.best_score || 0}</div>
                <div className="text-sm text-white/60">{t('bestScore')}</div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">{t('detailedStats')}</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-white/70">{t('totalScore')}</span>
                  <span className="font-bold">{myStats.total_score || 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-white/70">{t('wordsGuessed')}</span>
                  <span className="font-bold">{myStats.words_guessed || 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-white/70">{t('avgScore')}</span>
                  <span className="font-bold">
                    {myStats.games_played > 0 
                      ? Math.round(myStats.total_score / myStats.games_played) 
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="card">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="text-yellow-400" />
              {t('globalLeaderboard')}
            </h2>
            
            <div className="space-y-2">
              {leaderboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    player.id === user.id 
                      ? 'bg-blue/20 border-2 border-blue' 
                      : 'bg-white/5 hover:bg-white/10'
                  } transition-all`}
                >
                  <div className={`text-2xl font-bold w-12 text-center ${getRankColor(index + 1)}`}>
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-bold">{player.username}</div>
                    <div className="text-xs text-white/60">
                      {player.games_won} wins • {player.win_rate}% win rate
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue">{player.total_score}</div>
                    <div className="text-xs text-white/60">{t('totalScore')}</div>
                  </div>
                </div>
              ))}
            </div>

            {leaderboard.length === 0 && (
              <div className="text-center py-12 text-white/60">
                {t('noData')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Statistics;
