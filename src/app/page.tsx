'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, Loader2, Download, RefreshCcw, Cloud } from 'lucide-react';
let gapi: any;
if (typeof window !== 'undefined') {
  gapi = require('gapi-script').gapi;
}
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const SCOPES = 'https://www.googleapis.com/auth/drive.file';

  // Initialize Google API Client
  useEffect(() => {
    const start = () => {
      gapi.client.init({
        clientId: CLIENT_ID,
        scope: SCOPES,
      });
    };
    gapi.load('client:auth2', start);
  }, [CLIENT_ID]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const handleCompress = async () => {
    if (!file) return;
    setIsCompressing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/compress', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Compression failed');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = `data:${result.mimeType};base64,${result.data}`;
    link.download = `compressed_${result.fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDriveUpload = async () => {
    if (!result) return;
    setIsUploadingDrive(true);
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      let user = authInstance.currentUser.get();
      
      if (!user.hasGrantedScopes(SCOPES)) {
        user = await authInstance.signIn();
      }
      
      const token = user.getAuthResponse().access_token;

      // Convert Base64 payload to binary Blob for Google Drive
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {type: result.mimeType});

      // Step 1: Upload the file data directly to Drive
      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': result.mimeType,
        },
        body: blob
      });
      const uploadData = await uploadRes.json();

      // Step 2: Rename the file in Drive (Patch Metadata)
      await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `FYCS_compressed_${result.fileName}` })
      });

      alert('Success! File Saved to your Google Drive.');
    } catch (error) {
      console.error('Drive Upload Error:', error);
      alert('Upload to Google Drive Failed. Check console for details.');
    } finally {
      setIsUploadingDrive(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-8 text-center">
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-green-400">FYCS-Compressor</h1>
          <p className="text-neutral-400">Instantly compress Notes PDFs and Images securely.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
          
          {!result && (
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all flex flex-col items-center justify-center gap-4
                ${isDragActive ? 'border-green-400 bg-green-400/5' : 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50'}
                ${file ? 'border-green-500 bg-green-500/5' : ''}
              `}
            >
              <input {...getInputProps()} />
              {file ? (
                <>
                  <FileIcon className="w-12 h-12 text-green-400" />
                  <div className="text-sm">
                    <p className="font-semibold text-white">{file.name}</p>
                    <p className="text-neutral-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 text-neutral-400" />
                  <p className="text-neutral-300 font-medium">Drag & drop your file here</p>
                  <p className="text-xs text-neutral-500">Supports PDF, JPG, PNG, WEBP (Max 50MB)</p>
                </>
              )}
            </div>
          )}

          {file && !result && (
            <button
              onClick={handleCompress}
              disabled={isCompressing}
              className="mt-6 w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCompressing ? <><Loader2 className="w-5 h-5 animate-spin" /> Compressing...</> : 'Compress File'}
            </button>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-center">
                <div className="bg-green-500/20 p-4 rounded-full">
                  <FileIcon className="w-12 h-12 text-green-400" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700">
                  <p className="text-neutral-400 mb-1">Original Size</p>
                  <p className="font-bold text-lg">{(result.originalSize / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg border border-green-500/30">
                  <p className="text-green-400 mb-1">Compressed Size</p>
                  <p className="font-bold text-lg text-green-400">{(result.compressedSize / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              {/* The New Google Drive Button */}
              <button
                  onClick={handleDriveUpload}
                  disabled={isUploadingDrive}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUploadingDrive ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving to Drive...</> : <><Cloud className="w-5 h-5" /> Save to Google Drive</>}
              </button>

              <div className="flex gap-4">
                <button
                  onClick={() => { setFile(null); setResult(null); }}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" /> Start Over
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Local
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}