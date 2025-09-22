'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Shield, RefreshCw } from 'lucide-react';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  email: string;
  username: string;
  onSuccess: (user: any, token: string) => void;
}

export default function TwoFactorModal({
  isOpen,
  onClose,
  userId,
  email,
  username,
  onSuccess
}: TwoFactorModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  // Auto-send code when modal opens
  useEffect(() => {
    if (isOpen && !codeSent) {
      sendVerificationCode();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setError('');
      setCodeSent(false);
      setLoading(false);
      setSending(false);
    }
  }, [isOpen]);

  const sendVerificationCode = async () => {
    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email,
          username
        })
      });

      if (response.ok) {
        setCodeSent(true);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send verification code');
      }
    } catch (error) {
      setError('Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-2fa-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          code
        })
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess(data.user, data.token);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h2>
              <p className="text-sm text-gray-600">Verify your identity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Email info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span>Verification code sent to</span>
            </div>
            <p className="font-medium text-gray-900 mt-1">{email}</p>
          </div>

          {/* Code input form */}
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-2">
                Enter 6-digit verification code
              </label>
              <input
                id="verification-code"
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                maxLength={6}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>
              
              <button
                type="button"
                onClick={sendVerificationCode}
                disabled={sending}
                className="px-4 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
              >
                {sending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Resend'
                )}
              </button>
            </div>
          </form>

          {/* Help text */}
          <div className="text-xs text-gray-500 text-center">
            <p>Code expires in 10 minutes</p>
            <p>Check your email inbox and spam folder</p>
          </div>
        </div>
      </div>
    </div>
  );
}
