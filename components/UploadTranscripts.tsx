'use client';

import React, { useState, useRef } from 'react';
import { ApiService } from '@/lib/api';
import TeamFilter from '@/components/TeamFilter';
import PIFilter from '@/components/PIFilter';

interface UploadTranscriptsProps {
  selectedTeam: string;
  selectedPI: string;
}

interface FileWithId {
  id: string;
  file: File;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export default function UploadTranscripts({ selectedTeam, selectedPI }: UploadTranscriptsProps) {
  const [teamFiles, setTeamFiles] = useState<FileWithId[]>([]);
  const [piFiles, setPiFiles] = useState<FileWithId[]>([]);
  const [teamType, setTeamType] = useState<'Daily' | 'PI Sync'>('Daily');
  const [piType, setPiType] = useState<'Daily' | 'PI Sync'>('PI Sync');
  const [teamProgress, setTeamProgress] = useState(0);
  const [piProgress, setPiProgress] = useState(0);
  const [teamUploading, setTeamUploading] = useState(false);
  const [piUploading, setPiUploading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [piError, setPiError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null);
  const [piSuccess, setPiSuccess] = useState<string | null>(null);

  const teamFileInputRef = useRef<HTMLInputElement>(null);
  const piFileInputRef = useRef<HTMLInputElement>(null);
  const apiService = new ApiService();

  const validateFile = (file: File): string | null => {
    try {
      if (file.type !== 'text/plain' && !file.name.toLowerCase().endsWith('.txt')) {
        return 'Only .txt files are allowed';
      }
      if (file.size > MAX_FILE_SIZE) {
        return 'File size must be less than 2MB';
      }
      if (file.size === 0) {
        return 'File appears to be empty';
      }
      // Check if file is readable
      if (!file.name || file.name.trim() === '') {
        return 'Invalid file name';
      }
      return null;
    } catch (error) {
      console.error('File validation error:', error);
      return 'Error validating file';
    }
  };

  const handleFileSelect = (files: FileList | null, isTeam: boolean) => {
    if (!files) return;

    const newFiles: FileWithId[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file
        });
      }
    });

    if (errors.length > 0) {
      if (isTeam) {
        setTeamError(errors.join(', '));
      } else {
        setPiError(errors.join(', '));
      }
      return;
    }

    if (isTeam) {
      setTeamFiles(prev => [...prev, ...newFiles]);
      setTeamError(null);
    } else {
      setPiFiles(prev => [...prev, ...newFiles]);
      setPiError(null);
    }
  };

  const removeFile = (fileId: string, isTeam: boolean) => {
    if (isTeam) {
      setTeamFiles(prev => prev.filter(f => f.id !== fileId));
    } else {
      setPiFiles(prev => prev.filter(f => f.id !== fileId));
    }
  };

  const uploadFiles = async (files: FileWithId[], isTeam: boolean) => {
    if (files.length === 0) return;

    const setProgress = isTeam ? setTeamProgress : setPiProgress;
    const setUploading = isTeam ? setTeamUploading : setPiUploading;
    const setError = isTeam ? setTeamError : setPiError;
    const setSuccess = isTeam ? setTeamSuccess : setPiSuccess;

    setUploading(true);
    setError(null);
    setSuccess(null);
    setProgress(0);

    try {
      console.log('Starting upload process...');
      console.log('Files to upload:', files.map(f => f.file.name));
      console.log('Is Team:', isTeam);
      
      for (let i = 0; i < files.length; i++) {
        const fileWithId = files[i];
        console.log(`Uploading file ${i + 1}/${files.length}:`, fileWithId.file.name);
        
        try {
          if (isTeam) {
            await apiService.uploadTeamTranscript(fileWithId.file, selectedTeam, teamType);
          } else {
            await apiService.uploadPITranscript(fileWithId.file, selectedPI, piType);
          }
          console.log(`Successfully uploaded: ${fileWithId.file.name}`);
        } catch (fileError) {
          console.error(`Failed to upload ${fileWithId.file.name}:`, fileError);
          throw fileError; // Re-throw to be caught by outer catch
        }

        setProgress(((i + 1) / files.length) * 100);
      }

      setSuccess(`Successfully uploaded ${files.length} file(s)`);
      
      // Clear files after successful upload
      if (isTeam) {
        setTeamFiles([]);
      } else {
        setPiFiles([]);
      }
    } catch (error) {
      console.error('Upload process failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const FileUploadArea = ({ 
    files, 
    onFileSelect, 
    onRemoveFile, 
    fileInputRef, 
    isTeam, 
    title, 
    progress, 
    uploading, 
    error, 
    success 
  }: {
    files: FileWithId[];
    onFileSelect: (files: FileList | null) => void;
    onRemoveFile: (fileId: string) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    isTeam: boolean;
    title: string;
    progress: number;
    uploading: boolean;
    error: string | null;
    success: string | null;
  }) => (
    <div className="bg-white rounded-lg shadow-sm p-3">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      
      {/* Team-specific fields */}
      {isTeam && (
        <div className="mt-2 space-y-2">
          <TeamFilter
            selectedTeam={selectedTeam}
            onTeamChange={() => {}} // Read-only, controlled by parent
          />
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={teamType}
              onChange={(e) => setTeamType(e.target.value as 'Daily' | 'PI Sync')}
              className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="Daily">Daily</option>
              <option value="PI Sync">PI Sync</option>
            </select>
          </div>
        </div>
      )}

      {/* PI-specific fields */}
      {!isTeam && (
        <div className="mt-2 space-y-2">
          <PIFilter
            selectedPI={selectedPI}
            onPIChange={() => {}} // Read-only, controlled by parent
          />
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={piType}
              onChange={(e) => setPiType(e.target.value as 'Daily' | 'PI Sync')}
              className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="Daily">Daily</option>
              <option value="PI Sync">PI Sync</option>
            </select>
          </div>
        </div>
      )}

      {/* File Selection Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-gray-400 transition-colors cursor-pointer mt-2"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm">Click to select .txt files or drag and drop</p>
          <p className="text-xs text-gray-400 mt-1">Maximum file size: 2MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt"
          className="hidden"
          onChange={(e) => onFileSelect(e.target.files)}
        />
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="mt-2">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Selected Files:</h4>
          <div className="space-y-1">
            {files.map((fileWithId) => (
              <div key={fileWithId.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="text-sm text-gray-700">{fileWithId.file.name}</span>
                <button
                  onClick={() => onRemoveFile(fileWithId.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                  disabled={uploading}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={() => uploadFiles(files, isTeam)}
        disabled={files.length === 0 || uploading || (isTeam && !selectedTeam) || (!isTeam && !selectedPI)}
        className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow-sm p-3">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Upload Transcripts</h2>
        <p className="text-sm text-gray-600">Upload transcript files for team meetings or PI sessions.</p>
      </div>

      {/* Side by side containers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Team Transcripts Upload */}
        <FileUploadArea
          files={teamFiles}
          onFileSelect={(files) => handleFileSelect(files, true)}
          onRemoveFile={(fileId) => removeFile(fileId, true)}
          fileInputRef={teamFileInputRef}
          isTeam={true}
          title={`Upload Team Transcripts - ${selectedTeam}`}
          progress={teamProgress}
          uploading={teamUploading}
          error={teamError}
          success={teamSuccess}
        />

        {/* PI Transcripts Upload */}
        <FileUploadArea
          files={piFiles}
          onFileSelect={(files) => handleFileSelect(files, false)}
          onRemoveFile={(fileId) => removeFile(fileId, false)}
          fileInputRef={piFileInputRef}
          isTeam={false}
          title={`Upload PI Transcripts - ${selectedPI}`}
          progress={piProgress}
          uploading={piUploading}
          error={piError}
          success={piSuccess}
        />
      </div>
    </div>
  );
}
