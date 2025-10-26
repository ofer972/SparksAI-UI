'use client';

import { useState } from 'react';

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('ai-config');
  const [aiProvider, setAiProvider] = useState('openai');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [geminiTemperature, setGeminiTemperature] = useState(0);
  const [openaiTemperature, setOpenaiTemperature] = useState(0.7);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');

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
            <div className="flex justify-start">
              <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all">
                Save AI Configuration
              </button>
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
