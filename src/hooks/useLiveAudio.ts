import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { boardActionToolDefinitions } from '../lib/live-tools';
import { supabase } from '../lib/supabase';

export function useLiveAudio(onToolCall?: (name: string, args: any) => void) {
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const sessionRef = useRef<any | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: 'setMuted', muted: isMuted });
    }
  }, [isMuted]);

  // ── Audio helpers ──────────────────────────────────────────────────────────

  const int16ToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    // Use chunks to avoid call stack overflow on large buffers
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const playAudioChunk = useCallback((audioCtx: AudioContext, base64: string) => {
    // Resume context if suspended (browser auto-suspend policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    // Schedule seamlessly or start immediately if behind
    const now = audioCtx.currentTime;
    if (nextStartTimeRef.current < now) {
      nextStartTimeRef.current = now + 0.01; // tiny buffer to avoid clicks
    }
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
  }, []);

  // ── Stop ───────────────────────────────────────────────────────────────────

  const stopLive = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    nextStartTimeRef.current = 0;
    setIsLive(false);
    setIsConnecting(false);
  }, []);

  // ── Start ──────────────────────────────────────────────────────────────────

  const startLive = useCallback(async (sessionId: string, subjectVoice: string = 'Charon', subjectPromptAddition: string = '') => {
    setIsConnecting(true);
    setLiveError(null);
    setIsMuted(false);

    try {
      // 1. Get API token
      const tokenRes = await fetch('/api/live-token');
      const tokenData = await tokenRes.json();
      if (!tokenData.token) throw new Error('No token returned');

      const ai = new GoogleGenAI({ apiKey: tokenData.token, apiVersion: 'v1alpha' });

      // 2. Get lesson state
      let lessonStateStr = '';
      if (sessionId && supabase) {
        const { data } = await supabase
          .from('sessions')
          .select('lesson_state')
          .eq('id', sessionId)
          .single();
        if (data?.lesson_state) lessonStateStr = JSON.stringify(data.lesson_state);
      }

      const systemInstruction = `أنت لست مجرد أداة تشرح معلومات - أنت أستاذ حقيقي له شخصية، حماس، ودفء إنساني حقيقي. تتصرف كأنك جالس فعلياً في نفس الغرفة مع تلميذك (سنة ثالثة ثانوي، علوم تجريبية، جزائري)، تهتم بنجاحه شخصياً.
      ${subjectPromptAddition}
      حالة الدرس الحالية: ${lessonStateStr}
      
      أسلوب الشرح وقواعد استخدام السبورة الصارمة:
      - اشرح كأنك تخاطب تلميذاً يجد صعوبة في المادة، ويحتاج صبراً وتبسيطاً شديدين، وليس تلميذاً متفوقاً.
      - استعمل دائماً مثالاً واقعياً ملموساً قبل أو بعد أي تعريف مجرد.
      - تكلم بحرية وبأسلوب حواري طبيعي، ليس بجمل مكررة أو قوالب جامدة.
      - ⚠️ هام جداً: أنت تمتلك صلاحية تامة (Complete Authority) على السبورة التفاعلية للتلميذ. يجب عليك استخدام الأدوات المتاحة (Tools) بنشاط كبير وبشكل مستمر طوال وقت الشرح:
        1. عندما تبدأ في شرح مفهوم جديد، استدعِ (write_note).
        2. عند كتابة أي قانون أو معادلة، استدعِ (write_formula) بـ LaTeX.
        3. عند تقديم رسم بياني لدالة، استدعِ (plot_function).
        4. لتقريب الصورة ذهنياً، استدعِ (insert_thumbnail) واكتب كلمة بحث إنجليزية مناسبة (مثلاً 'apple' للجاذبية).
        5. لحذف شيء خاطئ أو لم يعد مطلوباً، استخدم (delete_shape) مع إعطاء الـ ID (إن وجد) أو لمسح السبورة كاملة استخدم (clear_board).
      - 🚨 تحذير صارم: الأدوات المتاحة لك محدودة بدقة لما هو معرّف في القائمة، لا تحاول استعمال أي أداة أو نوع عنصر غير موجود في التعريفات المعطاة لك (لا تستخدم emojis أو manim أو animations).
      - لا تشرح شفهياً فقط! التلميذ يحتاج أن يرى ما تشرحه مكتوباً أو مرسوماً على السبورة في نفس الوقت. كلما نطقت بمعادلة أو تعريف، استدعِ الأداة المناسبة فوراً بالتوازي مع كلامك.`;

      // 3. Setup audio BEFORE connecting so contexts are ready
      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputAudioCtx;

      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputAudioCtx;
      nextStartTimeRef.current = outputAudioCtx.currentTime;

      // 4. Get mic stream BEFORE connecting (faster startup)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        }
      });
      streamRef.current = stream;

      // 5. Load AudioWorklet
      await inputAudioCtx.audioWorklet.addModule('/audio-processor.js');
      const workletNode = new AudioWorkletNode(inputAudioCtx, 'microphone-processor');
      workletNodeRef.current = workletNode;
      workletNode.port.postMessage({ type: 'setMuted', muted: isMutedRef.current });

      // 6. Connect to Gemini Live — try models in order until one works
      // Model names to try (most preferred first)
      // These are the CONFIRMED bidiGenerateContent-capable models for this API key
      const MODELS_TO_TRY = [
        'gemini-2.5-flash-native-audio-preview-12-2025',
        'gemini-2.5-flash-native-audio-latest',
        'gemini-3.1-flash-live-preview',
      ];

      let session: any = null;
      let lastError: any = null;

      for (const modelName of MODELS_TO_TRY) {
        try {
          console.log(`[Live] Trying model: ${modelName}`);
          session = await ai.live.connect({
            model: modelName,
            config: {
              responseModalities: [Modality.AUDIO],
              systemInstruction: { parts: [{ text: systemInstruction }] },
              tools: [{ functionDeclarations: boardActionToolDefinitions }],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: subjectVoice } },
              },
              // Fast VAD: respond after 400ms silence instead of ~1.5s default
              realtimeInputConfig: {
                automaticActivityDetection: {
                  disabled: false,
                  silenceDurationMs: 400,
                  prefixPaddingMs: 20,
                }
              },
            },
            callbacks: {
              onopen: () => {
                console.log(`[Live] Connected with model: ${modelName}`);
                // Use setTimeout(0) to ensure state updates happen outside
                // any external library batching that might suppress React re-renders
                setTimeout(() => {
                  setIsLive(true);
                  setIsConnecting(false);
                }, 0);
                setTimeout(() => {
                  if (sessionRef.current) {
                    sessionRef.current.sendClientContent({
                      turns: [{
                        role: 'user',
                        parts: [{ text: 'التلميذ فتح الجلسة الآن، ابدأ بالترحيب فوراً وبحرارة وبإيجاز (جملتان فقط) بدون انتظار' }]
                      }]
                    });
                  }
                }, 300);
              },
              onmessage: async (message: any) => {
                console.log("[Live API Message Dump]", message);
                // Play audio output — check multiple possible locations
                const parts = message.serverContent?.modelTurn?.parts || [];
                const audioPart = parts.find((p: any) => p.inlineData?.data);
                const audioData = audioPart?.inlineData?.data;

                if (audioData && outputAudioCtxRef.current) {
                  playAudioChunk(outputAudioCtxRef.current, audioData);
                }

                // Handle interruption
                if (message.serverContent?.interrupted) {
                  if (outputAudioCtxRef.current) {
                    nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
                  }
                }

                // Handle tool calls
                if (message.toolCall && onToolCall) {
                  for (const call of message.toolCall.functionCalls) {
                    onToolCall(call.name, call.args);
                    try {
                      await session.sendToolResponse({
                        functionResponses: [{ name: call.name, id: call.id, response: { success: true } }]
                      });
                    } catch (e) {
                      console.warn('Tool response error:', e);
                    }
                  }
                }
              },
              onerror: (e: any) => {
                console.error('[Live] API error:', e);
                console.error('[Live] Error details:', JSON.stringify(e, null, 2));
                setLiveError(`خطأ في الاتصال: ${e?.message || JSON.stringify(e)}`);
                stopLive();
              },
              onclose: (e: any) => {
                console.warn('[Live] Connection closed!');
                console.warn('[Live] Close code:', e?.code);
                console.warn('[Live] Close reason:', e?.reason);
                console.warn('[Live] Was clean:', e?.wasClean);
                console.warn('[Live] Full close event:', JSON.stringify(e));
                if (e?.code && e.code !== 1000) {
                  setLiveError(`انقطع الاتصال (كود: ${e.code}) — ${e.reason || 'بدون سبب'}`);
                }
                stopLive();
              }
            }
          });
          // Model worked — break out of retry loop
          console.log(`[Live] Successfully connected with: ${modelName}`);
          lastError = null;
          break;
        } catch (modelErr: any) {
          console.warn(`[Live] Model ${modelName} failed:`, modelErr.message);
          lastError = modelErr;
          // Continue to next model
        }
      }

      if (!session) {
        throw lastError || new Error('All models failed to connect');
      }

      // ── CRITICAL: Set sessionRef BEFORE anything uses it ──────────────────
      sessionRef.current = session;

      // 7. Wire up microphone → worklet → Gemini
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio' && sessionRef.current) {
          // Resume input context if suspended
          if (inputAudioCtxRef.current?.state === 'suspended') {
            inputAudioCtxRef.current.resume().catch(() => {});
          }
          const base64 = int16ToBase64(event.data.buffer);
          sessionRef.current.sendRealtimeInput({
            audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };

      const source = inputAudioCtx.createMediaStreamSource(stream);
      source.connect(workletNode);

    } catch (err: any) {
      console.error('startLive error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setLiveError('mic_denied');
      } else {
        setLiveError(`تعذر بدء الاتصال: ${err.message || 'خطأ غير معروف'}`);
      }
      stopLive();
    }
  }, [stopLive, onToolCall, playAudioChunk]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const endSession = useCallback(() => {
    stopLive();
  }, [stopLive]);

  return { isLive, isConnecting, liveError, startLive, stopLive, isMuted, toggleMute, endSession };
}
