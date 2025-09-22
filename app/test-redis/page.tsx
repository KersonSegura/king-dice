'use client';

import { useState } from 'react';

export default function TestRedisPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, result: any) => {
    setTestResults(prev => [...prev, { test, result, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testPopularGames = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/games/popular?category=hot&limit=5');
      const data = await response.json();
      addResult('Popular Games API', {
        success: true,
        cached: data.cached,
        count: data.games?.length || 0,
        responseTime: 'Check network tab'
      });
    } catch (error) {
      addResult('Popular Games API', { success: false, error: error.message });
    }
    setLoading(false);
  };

  const testForumPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      addResult('Forum Posts API', {
        success: true,
        cached: data.cached,
        count: data.posts?.length || 0,
        responseTime: 'Check network tab'
      });
    } catch (error) {
      addResult('Forum Posts API', { success: false, error: error.message });
    }
    setLoading(false);
  };

  const testMultipleRequests = async () => {
    setLoading(true);
    addResult('Multiple Requests Test', { message: 'Starting 5 rapid requests...' });
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(fetch('/api/games/popular?category=hot&limit=3'));
    }
    
    try {
      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(r => r.json()));
      
      const cachedCount = results.filter(r => r.cached).length;
      addResult('Multiple Requests Test', {
        success: true,
        totalRequests: 5,
        cachedResponses: cachedCount,
        message: `${cachedCount}/5 requests were served from cache`
      });
    } catch (error) {
      addResult('Multiple Requests Test', { success: false, error: error.message });
    }
    setLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          🚀 Redis Cache Test Page
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={testPopularGames}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
          >
            {loading ? 'Testing...' : 'Test Popular Games API'}
          </button>
          
          <button
            onClick={testForumPosts}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
          >
            {loading ? 'Testing...' : 'Test Forum Posts API'}
          </button>
          
          <button
            onClick={testMultipleRequests}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
          >
            {loading ? 'Testing...' : 'Test Cache Performance'}
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={clearResults}
            className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
          >
            Clear Results
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Test Results:</h2>
          
          {testResults.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Click a test button above to see results
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">{result.test}</h3>
                    <span className="text-sm text-gray-500">{result.timestamp}</span>
                  </div>
                  
                  {result.success ? (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">✅</span>
                        <span className="text-sm text-gray-700">
                          {result.cached ? 'Served from cache' : 'Fetched from database'}
                        </span>
                      </div>
                      {result.count && (
                        <div className="text-sm text-gray-600">
                          Items returned: {result.count}
                        </div>
                      )}
                      {result.cachedResponses && (
                        <div className="text-sm text-gray-600">
                          {result.message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600">❌</span>
                      <span className="text-sm text-red-700">{result.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">How to Test Redis:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>1. Click "Test Popular Games API" - should show "Fetched from database"</li>
            <li>2. Click it again quickly - should show "Served from cache"</li>
            <li>3. Click "Test Cache Performance" - should show most requests cached</li>
            <li>4. Check browser Network tab to see response times</li>
          </ul>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> Redis caching is only active when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are configured in your environment variables.
          </p>
        </div>
      </div>
    </div>
  );
}
