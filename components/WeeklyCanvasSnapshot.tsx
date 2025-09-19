'use client';

import { useState, useEffect } from 'react';
import { Square, Calendar } from 'lucide-react';

interface WeeklySnapshot {
  id: string;
  week: string;
  imageData: string; // Base64 encoded canvas image
  timestamp: string;
}

export default function WeeklyCanvasSnapshot() {
  const [snapshot, setSnapshot] = useState<WeeklySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextSnapshotTime, setNextSnapshotTime] = useState<string>('');

  useEffect(() => {
    const fetchWeeklySnapshot = async () => {
      try {
        // Add cache busting to ensure we get the latest snapshot
        const response = await fetch(`/api/pixel-canvas/snapshot?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          console.log('📸 Fetched snapshot data:', data);
          setSnapshot(data.snapshot);
        } else {
          console.error('Failed to fetch weekly snapshot');
        }
      } catch (error) {
        console.error('Error fetching weekly snapshot:', error);
      } finally {
        setLoading(false);
      }
    };

    // Calculate next Sunday at midnight
    const calculateNextSnapshot = () => {
      const now = new Date();
      const nextSunday = new Date(now);
      const daysUntilSunday = (7 - now.getDay()) % 7;
      
      if (daysUntilSunday === 0 && now.getHours() === 0 && now.getMinutes() === 0) {
        // If it's Sunday at midnight, next snapshot is in 7 days
        nextSunday.setDate(now.getDate() + 7);
      } else if (daysUntilSunday === 0) {
        // If it's Sunday but not midnight, next snapshot is today at midnight
        nextSunday.setDate(now.getDate());
      } else {
        // Next Sunday
        nextSunday.setDate(now.getDate() + daysUntilSunday);
      }
      
      nextSunday.setHours(0, 0, 0, 0);
      setNextSnapshotTime(nextSunday.toLocaleDateString());
    };

    fetchWeeklySnapshot();
    calculateNextSnapshot();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Loading...</h3>
          </div>
          <div className="bg-gray-200 rounded-lg h-48 w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-[700px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Our Canvas Last Week</h3>
        </div>
        {nextSnapshotTime && (
          <div className="text-xs text-gray-500">
            Next: {nextSnapshotTime}
          </div>
        )}
      </div>
      
      <div className="bg-gray-100 rounded-lg p-2 flex-1 flex items-center justify-center">
        {snapshot?.imageData ? (
          <img 
            src={snapshot.imageData} 
            alt="Canvas from last week"
            className="w-full h-full rounded border border-gray-300 object-contain"
            style={{ 
              imageRendering: 'pixelated',
              minWidth: '300px',
              minHeight: '300px'
            }}
          />
        ) : (
          <div className="bg-gray-200 rounded border border-gray-300 h-48 w-48 flex items-center justify-center">
            <span className="text-gray-500 text-sm">No snapshot yet</span>
          </div>
        )}
      </div>
    </div>
  );
}
