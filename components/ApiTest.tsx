'use client';

import { useState } from 'react';
import { ApiService } from '@/lib/api';

export default function ApiTest() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testApiConnection = async () => {
    setLoading(true);
    setTestResults([]);
    
    const apiService = new ApiService();
    const tests = [
      { name: 'Teams API', test: () => apiService.getTeams() },
      { name: 'PIs API', test: () => apiService.getPIs() },
      { name: 'AI Cards API', test: () => apiService.getAICards('AutoDesign-Dev') },
      { name: 'Recommendations API', test: () => apiService.getRecommendations('AutoDesign-Dev') },
      { name: 'Team Metrics API', test: () => apiService.getTeamMetrics('AutoDesign-Dev') },
    ];

    const results = [];
    
    for (const test of tests) {
      try {
        console.log(`Testing ${test.name}...`);
        const result = await test.test();
        results.push({
          name: test.name,
          status: 'SUCCESS',
          data: result,
          error: null
        });
        console.log(`${test.name} SUCCESS:`, result);
      } catch (error) {
        results.push({
          name: test.name,
          status: 'ERROR',
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`${test.name} ERROR:`, error);
      }
    }
    
    setTestResults(results);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">API Connection Test</h2>
      
      <button
        onClick={testApiConnection}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg mb-4"
      >
        {loading ? 'Testing...' : 'Test API Connections'}
      </button>

      {testResults.length > 0 && (
        <div className="space-y-3">
          {testResults.map((result, index) => (
            <div key={index} className={`p-3 rounded-lg border ${
              result.status === 'SUCCESS' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{result.name}</h3>
                <span className={`px-2 py-1 rounded text-xs ${
                  result.status === 'SUCCESS' 
                    ? 'bg-green-200 text-green-800' 
                    : 'bg-red-200 text-red-800'
                }`}>
                  {result.status}
                </span>
              </div>
              
              {result.status === 'SUCCESS' && (
                <div className="mt-2 text-sm text-gray-600">
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {result.status === 'ERROR' && (
                <div className="mt-2 text-sm text-red-600">
                  <strong>Error:</strong> {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
