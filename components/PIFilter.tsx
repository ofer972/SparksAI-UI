'use client';

import { useState, useEffect, useRef } from 'react';
import { ApiService } from '@/lib/api';
import { getPITerminologyPlural } from '@/lib/piTerminology';

interface PIFilterProps {
 selectedPI: string;
 onPIChange: (pi: string) => void;
 className?: string;
}

interface PI {
 pi_name: string;
 start_date: string;
 end_date: string;
 planning_grace_days: number;
 prep_grace_days: number;
 updated_at: string;
}

interface PIResponse {
 success: boolean;
 data: {
 pis: PI[];
 count: number;
 };
 message: string;
}

export default function PIFilter({ selectedPI, onPIChange, className = '' }: PIFilterProps) {
 const [pis, setPis] = useState<PI[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const hasInitializedRef = useRef(false);

 useEffect(() => {
 const fetchPIs = async () => {
 try {
 setLoading(true);
 const apiService = new ApiService();
 const response = await apiService.getPIs();
 
 if (response.pis) {
 setPis(response.pis);
 } else {
 throw new Error('Failed to fetch PIs');
 }
 } catch (err) {
 console.error('Error fetching PIs:', err);
 setError(err instanceof Error ? err.message : 'Failed to fetch PIs');
 setPis([]);
 } finally {
 setLoading(false);
 }
 };

 fetchPIs();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []); // Only fetch once on mount

 // Auto-select current PI if no PI is selected
 useEffect(() => {
 const autoSelectCurrentPI = async () => {
 // Only run once on mount
 if (hasInitializedRef.current) return;
 
 // Check if PI is already selected
 if (selectedPI) {
 hasInitializedRef.current = true;
 return;
 }
 
 hasInitializedRef.current = true;
 
 try {
 const apiService = new ApiService();
 const piResponse = await apiService.getCurrentAndNextPIs();
 
 // The API returns {current_pis: [], next_pis: []} structure
 const currentPIs = (piResponse as any).current_pis || [];
 if (currentPIs.length > 0) {
 const currentPIName = currentPIs[0].pi_name;
 onPIChange(currentPIName);
 }
 } catch (err) {
 console.error('Failed to load current PI:', err);
 }
 };
 
 autoSelectCurrentPI();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [selectedPI]); // Run when selectedPI changes

 if (loading) {
 return (
 <select className={`w-full border border-outline-strong rounded-lg px-4 py-1 text-sm bg-surface-elevated text-content-primary ${className}`} disabled>
        <option>{`Loading ${getPITerminologyPlural()}...`}</option>
 </select>
 );
 }

 if (error) {
 return (
 <select className={`w-full border border-outline-strong rounded-lg px-4 py-1 text-sm bg-surface-elevated text-content-primary ${className}`} disabled>
        <option>{`Error loading ${getPITerminologyPlural()}`}</option>
 </select>
 );
 }

 return (
 <select
 value={selectedPI || ''}
 onChange={(e) => onPIChange(e.target.value || '')}
 className={`w-full border border-outline-strong rounded-lg px-4 py-1 text-sm bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 hover:border-outline-strong hover:border-outline-strong transition-colors ${className}`}
 >
 {pis.map((pi) => (
 <option key={pi.pi_name} value={pi.pi_name}>
 {pi.pi_name}
 </option>
 ))}
 </select>
 );
}
