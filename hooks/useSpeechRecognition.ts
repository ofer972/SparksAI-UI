'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechLanguage = 'en-US' | 'he-IL' | 'auto';

interface UseSpeechRecognitionOptions {
  loading: boolean;
  getInitialText: () => string;
  onTextChange: (text: string) => void;
}

interface UseSpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  language: SpeechLanguage;
  detectedLanguage: 'en-US' | 'he-IL' | null;
  error: string | null;
  setError: (err: string | null) => void;
  setLanguage: (lang: SpeechLanguage) => void;
  startListening: () => void;
  stopListening: (skipUpdate?: boolean) => void;
  toggleListening: () => void;
  clearTranscript: () => void;
  reset: () => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions
): UseSpeechRecognitionResult {
  const { loading, getInitialText, onTextChange } = options;

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const finalTranscriptRef = useRef<string>(''); // Track final transcript to avoid duplication
  const [speechLanguage, setSpeechLanguage] = useState<SpeechLanguage>('auto'); // Language selection
  const detectedLanguageRef = useRef<'en-US' | 'he-IL' | null>(null); // Auto-detected language
  const [detectedLanguage, setDetectedLanguage] = useState<'en-US' | 'he-IL' | null>(null); // For UI updates
  const autoModeTrialRef = useRef<'he-IL' | 'en-US' | null>(null); // Track which language we're trying in auto mode
  const autoModeSwitchTimerRef = useRef<number | null>(null); // Timer for language switching in auto mode
  const skipEndUpdateRef = useRef<boolean>(false); // Flag to skip onend update when clearing

  const isSpeechRecognitionSupported = useCallback(() => {
    return (
      typeof window !== 'undefined' &&
      (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window))
    );
  }, []);

  const detectLanguageFromText = useCallback((text: string): 'en-US' | 'he-IL' => {
    if (!text || text.trim().length === 0) return 'en-US'; // Default to English

    const hebrewPattern = /[\u0590-\u05FF]/;
    const hebrewMatches = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;

    if (totalChars < 3) return detectedLanguageRef.current || 'en-US';

    if (totalChars > 0 && (hebrewMatches / totalChars) > 0.3) {
      return 'he-IL';
    }

    if (hebrewMatches >= 2) {
      return 'he-IL';
    }

    if (hebrewPattern.test(text) && hebrewMatches >= 1 && totalChars <= 10) {
      return 'he-IL';
    }

    return 'en-US';
  }, []);

  const looksLikeTransliteratedHebrew = useCallback((text: string): boolean => {
    if (!text || text.length < 3) return false;

    const hebrewTransliterationPatterns = [
      /\b(sh|ch|tz|ts)[aeiou]/i,
      /\b(ha|le|ve|be|me|ke|she|ze|ze|ze)[\s]/i,
      /\b(ani|ata|atah|hu|hi|hem|hen|anachnu|atem|aten)\b/i,
      /\b(ma|eich|lamah|eifo|matay|echad|shtayim|shalosh)\b/i,
    ];

    const matches = hebrewTransliterationPatterns.filter(pattern => pattern.test(text)).length;
    return matches >= 2;
  }, []);

  const chooseTargetLanguage = useCallback((
    combinedText: string,
    currentLang: 'en-US' | 'he-IL'
  ): 'en-US' | 'he-IL' => {
    const hasHebrewChars = /[\u0590-\u05FF]/.test(combinedText);
    const looksLikeHebrew = looksLikeTransliteratedHebrew(combinedText);
    const detectedLang = detectLanguageFromText(combinedText);

    if (hasHebrewChars) {
      return 'he-IL';
    }

    if (looksLikeHebrew && currentLang === 'en-US') {
      return 'he-IL';
    }

    return detectedLang;
  }, [detectLanguageFromText, looksLikeTransliteratedHebrew]);

  const initializeSpeechRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setSpeechError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;

    if (speechLanguage === 'auto') {
      recognition.lang = detectedLanguageRef.current || autoModeTrialRef.current || 'he-IL';
    } else {
      recognition.lang = speechLanguage;
    }

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError(null);
    };

    const scheduleLanguageRestart = (
      targetLang: 'en-US' | 'he-IL',
      preservedText: string
    ) => {
      autoModeTrialRef.current = targetLang;
      detectedLanguageRef.current = targetLang;
      setDetectedLanguage(targetLang);

      try {
        recognitionRef.current.stop();
      } catch {
        // ignore stop errors here
      }

      if (autoModeSwitchTimerRef.current) {
        clearTimeout(autoModeSwitchTimerRef.current);
      }

      autoModeSwitchTimerRef.current = window.setTimeout(() => {
        if (isListening) {
          const newRecognition = initializeSpeechRecognition();
          if (newRecognition) {
            recognitionRef.current = newRecognition;
            finalTranscriptRef.current = preservedText + ' ';
            onTextChange(preservedText + ' ');
            recognitionRef.current.start();
            console.log(`Language switched to: ${targetLang === 'he-IL' ? 'Hebrew' : 'English'}`);
          }
        }
        autoModeSwitchTimerRef.current = null;
      }, 300);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (speechLanguage === 'auto' && finalTranscript) {
        const combinedText = finalTranscriptRef.current + finalTranscript;
        const currentLang = autoModeTrialRef.current || detectedLanguageRef.current || 'he-IL';

        if (combinedText.trim().length >= 3) {
          const targetLang = chooseTargetLanguage(combinedText, currentLang);

          if (targetLang !== currentLang && recognitionRef.current && isListening) {
            const preservedText = finalTranscriptRef.current.trim();
            scheduleLanguageRestart(targetLang, preservedText);
          } else if (!detectedLanguageRef.current) {
            detectedLanguageRef.current = targetLang;
            setDetectedLanguage(targetLang);
            console.log(`Language auto-detected: ${targetLang === 'he-IL' ? 'Hebrew' : 'English'}`);
          }
        }
      }

      if (speechLanguage === 'auto' && finalTranscript && autoModeTrialRef.current === 'he-IL') {
        const combinedText = finalTranscriptRef.current + finalTranscript;
        const wordCount = combinedText.trim().split(/\s+/).length;

        if (wordCount >= 5 && !/[\u0590-\u05FF]/.test(combinedText)) {
          if (detectedLanguageRef.current !== 'en-US' && recognitionRef.current && isListening) {
            console.log('No Hebrew detected after several words, switching to English');
            const preservedText = finalTranscriptRef.current.trim();
            scheduleLanguageRestart('en-US', preservedText);
          }
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
      }

      // Don't update if we're in the process of clearing (e.g., after sending)
      if (!skipEndUpdateRef.current) {
        onTextChange(finalTranscriptRef.current + interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      let errorMessage = 'Speech recognition error occurred.';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone settings.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'aborted':
          return;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      setSpeechError(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!skipEndUpdateRef.current) {
        onTextChange(finalTranscriptRef.current.trim());
      }
      skipEndUpdateRef.current = false;
    };

    return recognition;
  }, [
    detectLanguageFromText,
    isListening,
    isSpeechRecognitionSupported,
    looksLikeTransliteratedHebrew,
    chooseTargetLanguage,
    onTextChange,
    speechLanguage,
  ]);

  const startListening = useCallback(() => {
    if (loading) return;

    try {
      const baseText = getInitialText().trim();
      finalTranscriptRef.current = baseText + (baseText ? ' ' : '');

      if (speechLanguage === 'auto') {
        detectedLanguageRef.current = null;
        setDetectedLanguage(null);
        autoModeTrialRef.current = null;
      }

      if (autoModeSwitchTimerRef.current) {
        clearTimeout(autoModeSwitchTimerRef.current);
        autoModeSwitchTimerRef.current = null;
      }

      const recognition = initializeSpeechRecognition();
      if (!recognition) return;

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setSpeechError('Failed to start speech recognition. Please try again.');
    }
  }, [getInitialText, initializeSpeechRecognition, loading, speechLanguage]);

  const stopListening = useCallback((skipUpdate: boolean = false) => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    if (skipUpdate) {
      skipEndUpdateRef.current = true; // Also prevent onend from updating
    }
    if (!skipUpdate) {
      onTextChange(finalTranscriptRef.current.trim());
    }
  }, [onTextChange]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    skipEndUpdateRef.current = true; // Prevent onend from restoring text
    onTextChange('');
  }, [onTextChange]);

  const reset = useCallback(() => {
    finalTranscriptRef.current = '';
    setSpeechLanguage('auto');
    detectedLanguageRef.current = null;
    setDetectedLanguage(null);
    autoModeTrialRef.current = null;

    if (autoModeSwitchTimerRef.current) {
      clearTimeout(autoModeSwitchTimerRef.current);
      autoModeSwitchTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setSpeechError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      if (autoModeSwitchTimerRef.current) {
        clearTimeout(autoModeSwitchTimerRef.current);
        autoModeSwitchTimerRef.current = null;
      }
    };
  }, []);

  return {
    isSupported: isSpeechRecognitionSupported(),
    isListening,
    language: speechLanguage,
    detectedLanguage,
    error: speechError,
    setError: setSpeechError,
    setLanguage: setSpeechLanguage,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    reset,
  };
}

