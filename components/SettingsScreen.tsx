'use client';

import { useEffect, useState } from 'react';
import { ApiService } from '../lib/api';

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('ai-config');
  const [aiProvider, setAiProvider] = useState('openai');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [geminiTemperature, setGeminiTemperature] = useState(0);
  const [openaiTemperature, setOpenaiTemperature] = useState(0.7);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [originalGeminiApiKey, setOriginalGeminiApiKey] = useState<string | null>(null);
  const [originalOpenaiApiKey, setOriginalOpenaiApiKey] = useState<string | null>(null);
  const MASK = '********';
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load settings from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        const api = new ApiService();
        const result = await api.getSettings();
        if (!result) return;

        // Support both { data: { settings: {...} } } and flat objects
        const s = (result as any).settings ?? result;

        // Provider
        if (s.ai_provider) setAiProvider(s.ai_provider);

        // Models (backend provides a single ai_model for chatgpt/openai)
        if (s.ai_model) setOpenaiModel(s.ai_model);
        if (s.gemini_model) setGeminiModel(s.gemini_model);

        // Temperatures (map strings to numbers if needed)
        if (s.ai_gemini_temperature !== undefined) {
          const v = typeof s.ai_gemini_temperature === 'string' ? parseFloat(s.ai_gemini_temperature) : s.ai_gemini_temperature;
          if (!Number.isNaN(v)) setGeminiTemperature(v);
        } else if (s.gemini_temperature !== undefined) {
          const v = typeof s.gemini_temperature === 'string' ? parseFloat(s.gemini_temperature) : s.gemini_temperature;
          if (!Number.isNaN(v)) setGeminiTemperature(v);
        }

        if (s.ai_chatgpt_temperature !== undefined) {
          const v = typeof s.ai_chatgpt_temperature === 'string' ? parseFloat(s.ai_chatgpt_temperature) : s.ai_chatgpt_temperature;
          if (!Number.isNaN(v)) setOpenaiTemperature(v);
        } else if (s.openai_temperature !== undefined) {
          const v = typeof s.openai_temperature === 'string' ? parseFloat(s.openai_temperature) : s.openai_temperature;
          if (!Number.isNaN(v)) setOpenaiTemperature(v);
        }

        // API keys presence
        const hasGeminiKey = Boolean(s.gemini_api_key && String(s.gemini_api_key).length > 0);
        const openaiKeyValue = s.chatgpt_api_key || s.openai_api_key;
        const hasOpenaiKey = Boolean(openaiKeyValue && String(openaiKeyValue).length > 0);

        setOriginalGeminiApiKey(hasGeminiKey ? String(s.gemini_api_key) : null);
        setOriginalOpenaiApiKey(hasOpenaiKey ? String(openaiKeyValue) : null);
        setGeminiApiKey(hasGeminiKey ? MASK : '');
        setOpenaiApiKey(hasOpenaiKey ? MASK : '');
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);
      setSaveError(null);
      const api = new ApiService();
      // Match backend field names and types per /settings/batch
      const providerForApi = aiProvider === 'openai' ? 'chatgpt' : aiProvider; // backend expects 'chatgpt'
      // Determine keys to send: send original value if user didn't change (masked)
      const geminiKeyToSend = geminiApiKey && geminiApiKey !== MASK
        ? geminiApiKey
        : (originalGeminiApiKey ?? '');
      const openaiKeyToSend = openaiApiKey && openaiApiKey !== MASK
        ? openaiApiKey
        : (originalOpenaiApiKey ?? '');

      const payload: Record<string, any> = {
        ai_provider: String(providerForApi),
        ai_model: String(openaiModel),
        ai_gemini_temperature: String(geminiTemperature),
        ai_chatgpt_temperature: String(openaiTemperature),
        gemini_api_key: String(geminiKeyToSend),
        chatgpt_api_key: String(openaiKeyToSend),
      };

      console.log('Saving settings payload (batch):', payload);
      const result = await api.updateSettings(payload, 'admin@example.com');
      console.log('Save settings result:', result);

      // After save, mask and update originals
      setOriginalGeminiApiKey(payload.gemini_api_key);
      setOriginalOpenaiApiKey(payload.chatgpt_api_key);
      setGeminiApiKey(MASK);
      setOpenaiApiKey(MASK);

      setSaveMessage('Settings saved successfully');
    } catch (e) {
      console.error('Failed to save settings', e);
      setSaveError((e as any)?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const settingsTabs = [
    { id: 'ai-config', label: 'AI Configuration', icon: '🤖' },
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
  ];

  const geminiModels = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ];

  const openaiModels = [
    { value: 'gpt-4o-mini', label: 'GPT-4o-mini (Faster)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ai-config':
        return (
          <div className="space-y-4">
            {/* AI Provider Selection */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-600 w-20">AI Provider:</span>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
                >
                  <option value="openai">OpenAI ChatGPT</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>
            </div>

            {/* Google Gemini Configuration */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-4">Google Gemini Configuration</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">Model:</span>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
                  >
                    {geminiModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">API Key:</span>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter Gemini API key"
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">Temperature:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={geminiTemperature}
                      onChange={(e) => setGeminiTemperature(parseFloat(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded w-8 text-center">
                      {geminiTemperature}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* OpenAI ChatGPT Configuration */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-4">OpenAI ChatGPT Configuration</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">Model:</span>
                  <select
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
                  >
                    {openaiModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">API Key:</span>
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="Enter OpenAI API key"
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600 w-20">Temperature:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={openaiTemperature}
                      onChange={(e) => setOpenaiTemperature(parseFloat(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded w-8 text-center">
                      {openaiTemperature}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex flex-col items-start space-y-2">
              <button onClick={handleSave} disabled={saving} className={`bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all ${saving ? 'opacity-60 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-700'}`}>
                Save AI Configuration
              </button>
              {saveMessage && (
                <span className="text-xs text-green-600">{saveMessage}</span>
              )}
              {saveError && (
                <span className="text-xs text-red-600">{saveError}</span>
              )}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl mb-3">🚧</div>
            <h2 className="text-sm font-semibold mb-2">Coming Soon</h2>
            <p className="text-xs text-gray-600">
              {settingsTabs.find(tab => tab.id === activeTab)?.label} settings are under development.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Settings Header */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        
        {/* Settings Tabs */}
        <div className="flex space-x-1 border-b border-gray-200">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
