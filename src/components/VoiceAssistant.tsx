import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processVoiceCommand } from '../services/voiceAssistantService';
import { cn } from '../lib/utils';

interface VoiceAssistantProps {
  onAction: (action: string, args: any) => Promise<void>;
  accountNames: string[];
}

export default function VoiceAssistant({ onAction, accountNames }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const transcriptRef = useRef('');

  useEffect(() => {
    // Check for SpeechRecognition API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const currentTranscript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setTranscript(currentTranscript);
        transcriptRef.current = currentTranscript;
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalTranscript = transcriptRef.current;
        if (finalTranscript) {
          handleProcessCommand(finalTranscript);
        } else {
          setStatus(prev => prev === 'error' ? 'error' : 'idle');
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        setStatus('error');
        
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access denied. Please enable it in browser settings.');
        } else if (event.error === 'no-speech') {
          setErrorMessage('No speech detected. Please try again.');
        } else {
          setErrorMessage(`Error: ${event.error}`);
        }

        setTimeout(() => {
          setStatus('idle');
          setErrorMessage('');
        }, 5000);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      transcriptRef.current = '';
      setStatus('listening');
      setErrorMessage('');
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Recognition start error', err);
        setIsListening(false);
        setStatus('error');
        setErrorMessage('Failed to start microphone.');
      }
    }
  };

  const handleProcessCommand = async (text: string) => {
    setIsProcessing(true);
    setStatus('processing');
    setErrorMessage('');
    try {
      const calls = await processVoiceCommand(text, accountNames);
      if (calls && calls.length > 0) {
        for (const call of calls) {
          await onAction(call.name, call.args);
        }
        setStatus('success');
      } else {
        // Model didn't find a function to call
        setStatus('error');
        setErrorMessage("I'm not sure how to handle that request yet.");
      }
    } catch (error: any) {
      console.error('Voice command processing error', error);
      setStatus('error');
      setErrorMessage(error.message || "Something went wrong processing your request.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setStatus('idle');
        setTranscript('');
        setErrorMessage('');
      }, 3000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        disabled={isProcessing}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl relative",
          isListening 
            ? "bg-red-500 text-white animate-pulse" 
            : isProcessing 
              ? "bg-zinc-800 text-white/40 cursor-not-allowed"
              : "bg-white text-black hover:bg-brand-emerald hover:scale-110 active:scale-95"
        )}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 size={24} />
            </motion.div>
          ) : isListening ? (
            <motion.div
              key="listening"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Mic size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Mic size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Status Tooltip/Overlay */}
      <AnimatePresence>
        {(status !== 'idle' || transcript) && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-zinc-900 border border-white/10 p-4 rounded-2xl shadow-2xl z-[60] text-center"
          >
            <div className="flex flex-col items-center gap-3">
              {status === 'listening' && (
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
                </div>
              )}
              {status === 'success' && <CheckCircle2 className="text-brand-emerald" size={24} />}
              {status === 'error' && <AlertCircle className="text-red-500" size={24} />}
              
              <p className="text-[10px] uppercase font-black tracking-widest text-white/40">
                {status === 'listening' ? 'Listening...' : status === 'processing' ? 'Thinking...' : status === 'success' ? 'Task Completed' : status === 'error' ? 'Pardon me?' : 'Assistant'}
              </p>
              
              <div className="h-px w-full bg-white/5" />

              <p className="text-sm font-medium leading-relaxed italic opacity-80">
                {errorMessage || transcript || (status === 'processing' ? 'Processing your request...' : status === 'success' ? 'Applied changes successfully' : status === 'error' ? "I didn't quite catch that. Try again?" : "How can I help?")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
