import React, { useState, useRef } from 'react';
import axios from 'axios';
import { CheckCircle, AlertCircle, FileType } from 'lucide-react';

const FileUpload = ({ onUploadSuccess }: { onUploadSuccess: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setStatus('idle');
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);
    if (password) {
      formData.append('password', password);
    }

    try {
      const response = await axios.post('http://localhost:8000/api/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setStatus('success');
      setMessage(response.data.message);
      
      // Delay to show success message, then switch view
      setTimeout(() => {
        onUploadSuccess();
      }, 1500);
    } catch (err: unknown) {
      setStatus('error');
      // @ts-expect-error - axios error type
      setMessage(err.response?.data?.detail || 'An error occurred during upload.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div 
        className={`w-full border-2 border-dashed rounded-[2rem] py-20 px-8 text-center transition-all duration-300 relative overflow-hidden
          ${isDragOver ? 'border-[#10b981] bg-[#ecfdf5] scale-[1.01]' : 'border-gray-300 bg-white hover:border-gray-400'}
          ${status === 'uploading' ? 'opacity-70 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.csv"
          className="hidden" 
        />
        
        {file ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <FileType className="w-20 h-20 text-[#10b981] mb-6 drop-shadow-sm" />
            <p className="text-2xl font-semibold text-gray-800 truncate w-full max-w-md px-4 mb-2">{file.name}</p>
            <p className="text-base text-gray-500 mb-8">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <button
              onClick={() => {
                setFile(null);
                setPassword('');
                setStatus('idle');
              }}
              className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors underline"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-in fade-in duration-500">
            <h3 className="text-[1.75rem] font-semibold text-[#1e293b] mb-4">Drop your statement here</h3>
            <p className="text-gray-500 text-lg mb-8">or click to browse &middot; CSV or PDF up to 10 MB</p>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-3.5 bg-[#10b981] hover:bg-[#059669] text-white text-lg font-medium rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Choose file
            </button>
          </div>
        )}
      </div>

      {file && (
        <div className="mt-8 max-w-md mx-auto animate-in slide-in-from-top-4 fade-in duration-300">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PDF Password <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password if PDF is protected"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-shadow text-base"
          />
          
          <button
            onClick={handleUpload}
            disabled={status === 'uploading'}
            className="mt-6 w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-[#10b981] hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10b981] transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {status === 'uploading' ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting Insights...
              </span>
            ) : 'Analyze Statement'}
          </button>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-8 max-w-md mx-auto p-4 bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg flex items-start text-[#065f46] text-base animate-in zoom-in-95 duration-300 shadow-sm">
          <CheckCircle className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Upload Successful</p>
            <p className="mt-1 opacity-90">{message}</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-8 max-w-md mx-auto p-4 bg-red-50 border border-red-200 rounded-lg flex items-start text-red-700 text-base animate-in slide-in-from-top-2 duration-300 shadow-sm">
          <AlertCircle className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Upload Failed</p>
            <p className="mt-1 opacity-90">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
