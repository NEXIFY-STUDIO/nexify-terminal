"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Fingerprint, RefreshCw, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pin, setPin] = useState<string>('');
  const [isFaceIdAvailable, setIsFaceIdAvailable] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [errorShake, setErrorShake] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Custom Audio-Haptic fallback for iOS speaker pulse
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    try {
      // 1. Android/Chrome standard vibration API
      if ('vibrate' in navigator) {
        if (type === 'light') navigator.vibrate(20);
        else if (type === 'medium') navigator.vibrate(50);
        else if (type === 'heavy') navigator.vibrate(100);
        else if (type === 'success') navigator.vibrate([40, 30, 40]);
        else if (type === 'error') navigator.vibrate([100, 50, 100]);
        return;
      }

      // 2. iOS Speaker Pulse Fallback (Web Audio API)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Extremely low pitch (60Hz) to drive speaker cone vibration physical feedback
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      
      if (type === 'light') {
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      } else if (type === 'medium') {
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'heavy' || type === 'error') {
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'success') {
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.setValueAtTime(0.01, ctx.currentTime + 0.03);
        gain.gain.setValueAtTime(0.8, ctx.currentTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      console.warn('Haptic trigger skipped:', e);
    }
  };

  useEffect(() => {
    // Check if session token exists
    const token = localStorage.getItem('nexify_authenticated');
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    // Check if biometrics (WebAuthn) is supported
    if (window.PublicKeyCredential) {
      setIsFaceIdAvailable(true);
    }
  }, []);

  // Base64 helper for challenge conversion
  const bufferFromBase64Url = (base64url: string): Uint8Array => {
    const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = window.atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const handleFaceIdAuth = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setErrorMessage('');
    triggerHaptic('medium');

    try {
      // 1. Fetch challenge from API
      const challengeRes = await fetch('/api/auth/challenge');
      if (!challengeRes.ok) throw new Error('Nie je možné načítať WebAuthn challenge.');
      const options = await challengeRes.ok ? await challengeRes.json() : null;
      if (!options) throw new Error('Chyba servera pri generovaní challenge.');

      // 2. Prepare WebAuthn credentials retrieval request
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: bufferFromBase64Url(options.challenge) as any,
        rpId: options.rp.id,
        userVerification: 'required', // Forces Face ID / Touch ID / Device passcode
        timeout: options.timeout,
        allowCredentials: [] // Empty allows any credentials bound to this domain/device
      };

      // 3. Request credential from hardware key/biometrics
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as any;

      if (!credential) {
        throw new Error('Biometrické overenie bolo zrušené.');
      }

      // 4. Send credential response to verification API
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: credential.id,
          rawId: credential.id,
          type: credential.type,
          response: {
            clientDataJSON: window.btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
            authenticatorData: window.btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
            signature: window.btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
            userHandle: credential.response.userHandle ? window.btoa(String.fromCharCode(...new Uint8Array(credential.response.userHandle))) : null
          }
        })
      });

      const verifyResult = await verifyRes.json();
      if (verifyResult.success) {
        triggerHaptic('success');
        localStorage.setItem('nexify_authenticated', verifyResult.token);
        setIsAuthenticated(true);
      } else {
        throw new Error(verifyResult.error || 'Biometrické overenie zlyhalo.');
      }

    } catch (err: any) {
      console.error('Face ID Error:', err);
      // Fail fallback to passcode
      setErrorMessage(err.message || 'Face ID zlyhalo. Použite PIN kód.');
      triggerHaptic('error');
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 500);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length >= 4) return;
    triggerHaptic('light');
    const newPin = pin + num;
    setPin(newPin);

    // If 4 digits entered, automatically verify
    if (newPin.length === 4) {
      verifyPin(newPin);
    }
  };

  const handleDelete = () => {
    if (pin.length === 0) return;
    triggerHaptic('light');
    setPin(pin.slice(0, -1));
  };

  const verifyPin = (inputPin: string) => {
    // Pre-configured passcode PIN fallback (default 1337)
    const securePin = process.env.NEXT_PUBLIC_PASSCODE || '1337';

    setTimeout(() => {
      if (inputPin === securePin) {
        triggerHaptic('success');
        localStorage.setItem('nexify_authenticated', 'pin-authenticated-session-' + Date.now());
        setIsAuthenticated(true);
      } else {
        setErrorMessage('Nesprávny PIN kód. Skúste to znova.');
        triggerHaptic('error');
        setErrorShake(true);
        setPin('');
        setTimeout(() => setErrorShake(false), 500);
      }
    }, 200);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexify_authenticated');
    setIsAuthenticated(false);
    setPin('');
    setErrorMessage('');
  };

  // If loading authentication state, return empty screen
  if (isAuthenticated === null) {
    return <div className="fixed inset-0 bg-black" />;
  }

  // Render original app content if authenticated
  if (isAuthenticated) {
    return (
      <>
        {children}
        {/* Subtle, premium native logout anchor for testing in development */}
        <button 
          onClick={handleLogout}
          className="fixed top-2 right-2 z-50 text-[10px] text-muted-foreground/30 hover:text-muted-foreground font-mono bg-black/20 px-2 py-0.5 rounded border border-border/20 backdrop-blur"
        >
          LOCK
        </button>
      </>
    );
  }

  // Render Cyberpunk Auth Guard Screen
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden select-none touch-none">
      {/* Background neon elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />

      {/* Auth Box Container */}
      <div className={`w-full max-w-[440px] px-8 flex flex-col items-center gap-[36px] ${errorShake ? 'animate-shake' : ''}`}>
        
        {/* Lock Icon Indicator */}
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-20 h-20 rounded-full bg-secondary/80 border border-border/40 flex items-center justify-center shadow-2xl relative">
            <Lock className="w-[28px] h-[28px] text-cyan-400" />
            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-30" />
          </div>
          <h1 className="text-2xl font-semibold tracking-wider text-foreground font-heading">NEXIFY TERMINAL</h1>
          <p className="text-sm text-muted-foreground tracking-widest font-mono">SECURE INTERFACE</p>
        </div>

        {/* PIN Indicators */}
        <div className="flex flex-col items-center gap-5 w-full">
          <div className="flex items-center justify-center gap-6">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border transition-all duration-300 ${
                  pin.length > index
                    ? 'bg-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] scale-110'
                    : 'border-border/80 bg-transparent'
                }`}
              />
            ))}
          </div>
          {errorMessage && (
            <p className="text-sm text-destructive font-mono font-medium text-center h-4 animate-fade-in">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Biometrics Action */}
        {isFaceIdAvailable && (
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={handleFaceIdAuth}
              variant="outline"
              size="icon"
              disabled={isAuthenticating}
              className="w-16 h-16 rounded-2xl bg-secondary/40 border-cyan-500/20 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 transition-all duration-300 shadow-xl flex items-center justify-center active:scale-95 shrink-0"
            >
              {isAuthenticating ? (
                <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
              ) : (
                <Fingerprint className="w-[32px] h-[32px]" />
              )}
            </Button>
            <p className="text-[11.5px] text-cyan-500/70 font-mono font-medium uppercase tracking-wider">
              {isAuthenticating ? 'Overujem...' : 'Použiť Face ID'}
            </p>
          </div>
        )}

        {/* Custom Monospace Numeric Keypad */}
        <div className="grid grid-cols-3 gap-y-[18px] gap-x-[37px] w-full max-w-[322px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="w-[74px] h-[74px] rounded-full bg-secondary/20 hover:bg-secondary/40 border border-border/20 hover:border-border/40 text-foreground text-[28px] font-normal font-mono flex items-center justify-center transition-all duration-200 active:bg-cyan-500/10 active:border-cyan-500/30 active:text-cyan-400 active:scale-95 shadow-md"
            >
              {num}
            </button>
          ))}
          {/* Keypad Footer (Empty, 0, Backspace) */}
          <div className="w-[74px] h-[74px]" /> {/* Spacer */}
          <button
            onClick={() => handleKeyPress('0')}
            className="w-[74px] h-[74px] rounded-full bg-secondary/20 hover:bg-secondary/40 border border-border/20 hover:border-border/40 text-foreground text-[28px] font-normal font-mono flex items-center justify-center transition-all duration-200 active:bg-cyan-500/10 active:border-cyan-500/30 active:text-cyan-400 active:scale-95 shadow-md"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-[74px] h-[74px] rounded-full bg-transparent text-muted-foreground hover:text-foreground flex items-center justify-center transition-all duration-200 active:scale-90"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Styled Embed styles for lock animations */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
