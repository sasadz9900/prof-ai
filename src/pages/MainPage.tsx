import { useState, useRef, useEffect, useCallback } from 'react';
import { Tldraw, useEditor, Editor, createShapeId, TLShapeId, AssetRecordType } from 'tldraw';
import { useParams } from 'react-router-dom';
import 'tldraw/tldraw.css';
import {
  LogOut, Image as ImageIcon, Mic, MicOff, Loader2,
  MessageSquare, X, ChevronDown, Plus, Volume2, VolumeX
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { evaluate } from 'mathjs';
import { useLiveAudio } from '../hooks/useLiveAudio';
import { useBoardLayout } from '../hooks/useBoardLayout';
import { FunctionGraphShapeUtil } from '../shapes/FunctionGraphShape';
import { GeometricShapeShapeUtil } from '../shapes/GeometricShapeShape';
import { FormulaShapeUtil } from '../shapes/FormulaShape';
import { InteractiveGraphShapeUtil } from '../shapes/InteractiveGraphShape';
import { PhysicsSimulationShapeUtil } from '../shapes/PhysicsSimulationShape';

const customShapeUtils = [FunctionGraphShapeUtil, GeometricShapeShapeUtil, FormulaShapeUtil, InteractiveGraphShapeUtil, PhysicsSimulationShapeUtil] as any;

interface BoardPage {
  id: string;
  title: string;
}

// Inner tldraw component to capture editor ref
function TldrawInside({
  editorRef,
  onEditorReady,
}: {
  editorRef: React.MutableRefObject<Editor | null>;
  onEditorReady?: (editor: Editor) => void;
}) {
  const editor = useEditor();
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
      onEditorReady?.(editor);
    }
  }, [editor, editorRef, onEditorReady]);
  return null;
}

// Sound Wave indicator (manim-style bars)
function SoundWaveBars({ active }: { active: boolean }) {
  if (!active) return (
    <div className="flex items-center gap-[3px]">
      {[1,2,3,4].map(i => (
        <div key={i} className="w-[3px] h-[4px] bg-indigo-300 rounded-full" />
      ))}
    </div>
  );
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 20 }}>
      <div className="w-[3px] bg-indigo-400 rounded-full sound-bar-1" style={{ height: 4 }} />
      <div className="w-[3px] bg-indigo-500 rounded-full sound-bar-2" style={{ height: 8 }} />
      <div className="w-[3px] bg-indigo-600 rounded-full sound-bar-3" style={{ height: 12 }} />
      <div className="w-[3px] bg-indigo-500 rounded-full sound-bar-4" style={{ height: 6 }} />
    </div>
  );
}

export default function MainPage({ session }: { session: any }) {
  const { subjectId, lessonId } = useParams();
  const editorRef = useRef<Editor | null>(null);

  // Pages state (mirrors tldraw pages)
  const [pages, setPages] = useState<BoardPage[]>([{ id: 'page:page', title: 'الصفحة 1' }]);
  const [currentPageId, setCurrentPageId] = useState<string>('page:page');

  // Chat panel
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Session
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Speaking
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Video shape
  const [currentVideoShapeId, setCurrentVideoShapeId] = useState<TLShapeId | null>(null);

  const { state: layoutState, getNextPosition, getShapeCenter } = useBoardLayout();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Page Management ────────────────────────────────────────────────────────

  const syncPagesFromEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const editorPages = editor.getPages();
    setPages(editorPages.map((p, i) => ({
      id: p.id as string,
      title: (p.meta?.title as string) || `الصفحة ${i + 1}`
    })));
    setCurrentPageId(editor.getCurrentPageId() as string);
  }, []);

  const handleEditorReady = useCallback((editor: Editor) => {
    syncPagesFromEditor();
    // Listen to page changes
    const unsubscribe = editor.store.listen(() => {
      syncPagesFromEditor();
    }, { scope: 'document', source: 'all' });
    return unsubscribe;
  }, [syncPagesFromEditor]);

  const switchToPage = (pageId: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    try { editor.setCurrentPage(pageId as any); } catch (e) { console.warn('switchToPage error', e); }
    setCurrentPageId(pageId);
    layoutState.current.cursorY = 100;
  };

  const addPage = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const title = `الصفحة ${pages.length + 1}`;
    editor.createPage({ name: title, meta: { title } });
    // syncPagesFromEditor will be called by the store listener
    layoutState.current.cursorY = 100;
  };

  // ── Tool Call Handler (stable ref — never re-created) ────────────────────
  // Must use a ref so useLiveAudio callback is stable and doesn't re-render
  const handleToolCallRef = useRef<(name: string, args: any) => void>(null as any);

  const handleToolCall = useCallback((name: string, args: any) => {
    const editor = editorRef.current;

    if (name === 'new_page') {
      if (!editor) return;
      const title = args.title || `الصفحة ${pages.length + 1}`;
      editor.createPage({ name: title, meta: { title } });
      syncPagesFromEditor();
      layoutState.current.cursorY = 100;
      return;
    }

    if (name === 'switch_page') {
      if (!editor) return;
      const editorPages = editor.getPages();
      const idx = Math.max(0, Math.min(args.index ?? 0, editorPages.length - 1));
      const target = editorPages[idx];
      if (target) {
        editor.setCurrentPage(target.id);
        setCurrentPageId(target.id as string);
        layoutState.current.cursorY = 100;
      }
      return;
    }

    if (name === 'set_page_title') {
      if (!editor) return;
      const currentPage = editor.getCurrentPage();
      editor.updatePage({ id: currentPage.id, meta: { title: args.title } });
      syncPagesFromEditor();
      return;
    }

    executeDrawAction({ type: name, ...args });
  }, [pages.length, syncPagesFromEditor, layoutState]);

  // Keep the ref always updated
  useEffect(() => {
    handleToolCallRef.current = handleToolCall;
  }, [handleToolCall]);

  // Stable wrapper that the hook sees as constant
  const stableHandleToolCall = useCallback((name: string, args: any) => {
    handleToolCallRef.current?.(name, args);
  }, []);

  const { isLive, isConnecting, liveError, startLive, isMuted, toggleMute, endSession } =
    useLiveAudio(stableHandleToolCall);

  // ── Session init & ONE-SHOT auto-start ──────────────────────────────────────
  const hasAutoStartedRef = useRef(false);

  useEffect(() => {
    const initSession = async () => {
      if (!supabase || !session?.user?.id) return;
      if (hasAutoStartedRef.current) return;

      let voice = 'Charon';
      let promptAdd = '';
      let topicTitle = 'درس جديد';

      if (subjectId) {
        const { data: subj } = await supabase.from('subjects').select('*').eq('id', subjectId).single();
        if (subj) {
          voice = subj.teacher_voice || 'Charon';
          promptAdd = subj.teacher_prompt_addition || '';
        }
      }

      if (lessonId) {
        const { data: less } = await supabase.from('lessons').select('*').eq('id', lessonId).single();
        if (less) topicTitle = less.title;
      }

      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      let sid = null;
      if (sessions && sessions.length > 0) {
        sid = sessions[0].id;
        // Update current session's lesson topic
        await supabase.from('sessions').update({ lesson_state: { topic: topicTitle } }).eq('id', sid);
      } else {
        const { data: newSession } = await supabase
          .from('sessions')
          .insert([{ user_id: session.user.id, subject: topicTitle, lesson_state: { topic: topicTitle } }])
          .select()
          .single();
        if (newSession) sid = newSession.id;
      }
      
      setSessionId(sid);
      
      if (sid) {
        hasAutoStartedRef.current = true;
        startLive(sid, voice, promptAdd);
      }
    };
    initSession();
  }, [session, subjectId, lessonId, startLive]);

  // ── Track student progress ──────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase || !session?.user?.id || !lessonId) return;

    const trackProgress = async () => {
      try {
        await supabase.from('student_progress').upsert({
          user_id: session.user.id,
          lesson_id: lessonId,
          status: 'in_progress',
          last_accessed: new Date().toISOString()
        }, { onConflict: 'user_id,lesson_id' });
      } catch (err) {
        console.error('Failed to track progress:', err);
      }
    };

    trackProgress();
  }, [lessonId, session?.user?.id]);

  // If mic denied, open chat panel as fallback
  useEffect(() => {
    if (liveError === 'mic_denied') {
      setChatOpen(true);
    }
  }, [liveError]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toRichText = (text: string) => {
    if (!text) text = '';
    return {
      type: 'doc',
      content: text.split('\n').map(line => {
        if (!line) return { type: 'paragraph' };
        return { type: 'paragraph', content: [{ type: 'text', text: line }] };
      })
    };
  };

  // ── Board Actions ──────────────────────────────────────────────────────────

  const executeDrawAction = async (action: any) => {
    const editor = editorRef.current;
    if (!editor) return;

    const id = action.id ? `shape:${action.id}` : createShapeId();
    const { x, y, w, h } = getNextPosition(editor, action.type, action.content || '');

    const getColor = (c?: string) => {
      switch (c) {
        case 'blue': return 'blue';
        case 'green': return 'green';
        case 'red': return 'red';
        case 'purple': return 'violet';
        default: return 'black';
      }
    };

    switch (action.type) {
      case 'clear_board': {
        const shapes = editor.getCurrentPageShapes();
        editor.deleteShapes(shapes.map(s => s.id));
        layoutState.current.cursorY = 100;
        break;
      }
      case 'write_note': {
        const color = getColor(action.style?.color);
        if (action.style?.emphasis === 'box') {
          editor.createShape({
            ...({} as any),
            id: createShapeId(),
            type: 'geo',
            x: x - 20, y: y - 20,
            props: { geo: 'rectangle', w: w + 40, h: h + 40, color, fill: 'none', size: 'm' }
          });
        }
        editor.createShape({
          ...({} as any),
          id, type: 'text', x, y,
          props: { richText: toRichText(action.content), size: 'm', color }
        });
        if (action.style?.connects_to) {
          const targetCenter = getShapeCenter(editor, `shape:${action.style.connects_to}`);
          if (targetCenter) {
            editor.createShape({
              ...({} as any),
              id: createShapeId(), type: 'arrow',
              x: targetCenter.x, y: targetCenter.y,
              props: { start: { x: 0, y: 0 }, end: { x: (x + w / 2) - targetCenter.x, y: y - targetCenter.y }, color: 'grey' }
            });
          }
        }
        break;
      }
      case 'write_formula': {
        editor.createShape({
          ...({} as any),
          id, type: 'formula', x, y,
          props: { latex: action.latex || '', color: action.color || 'blue', w, h }
        });
        break;
      }
      case 'draw_vector': {
        const [fromX, fromY] = action.from || [0, 0];
        const [toX, toY] = action.to || [100, 100];
        editor.createShape({
          ...({} as any),
          id, type: 'arrow', x: fromX, y: fromY,
          props: { start: { x: 0, y: 0 }, end: { x: toX - fromX, y: toY - fromY }, color: 'red', size: 'm' }
        });
        if (action.label) {
          editor.createShape({
            ...({} as any),
            id: createShapeId(), type: 'text', x: toX + 10, y: toY - 10,
            props: { richText: toRichText(action.label), color: 'red', size: 's' }
          });
        }
        break;
      }
      case 'plot_function': {
        try {
          editor.createShape({
            ...({} as any),
            id, type: 'interactive-graph', x, y,
            props: { expression: action.expression, domain: action.domain || [-5, 5], color: action.color || 'blue', w, h }
          });
          editor.createShape({
            ...({} as any),
            id: createShapeId(), type: 'text', x: x + 200, y: y - 30,
            props: { richText: toRichText(`f(x) = ${action.expression}`), color: getColor(action.color), size: 's' }
          });
        } catch (e) { console.error('Failed to plot function:', e); }
        break;
      }
      case 'simulate_physics': {
        editor.createShape({
          ...({} as any),
          id, type: 'physics-simulation', x, y,
          props: { scenario: action.scenario || 'freefall', w: 400, h: 400 }
        });
        break;
      }
      case 'draw_shape': {
        if (action.vertices && Array.isArray(action.vertices)) {
          editor.createShape({
            ...({} as any),
            id, type: 'geometric-shape', x, y,
            props: { shapeType: action.shapeType || 'polygon', vertices: action.vertices, labels: action.labels || [], color: action.color || 'blue', w, h }
          });
        }
        break;
      }
      case 'show_video': {
        let videoId = 'dQw4w9WgXcQ';
        let isVerified = false;
        if (supabase && action.concept_tag) {
          const { data } = await supabase.from('curated_videos').select('youtube_video_id, verified').eq('concept_tag', action.concept_tag).single();
          if (data?.youtube_video_id && data.verified) { videoId = data.youtube_video_id; isVerified = true; }
        }
        if (!isVerified) break;
        const videoShapeId = createShapeId();
        editor.createShape({ ...({} as any), id: videoShapeId, type: 'embed', x, y, props: { url: `https://www.youtube.com/watch?v=${videoId}`, w: 480, h: 360 } });
        setCurrentVideoShapeId(videoShapeId);
        break;
      }
      case 'hide_video': {
        if (currentVideoShapeId) { editor.deleteShapes([currentVideoShapeId]); setCurrentVideoShapeId(null); }
        break;
      }
      case 'highlight': {
        editor.createShape({
          ...({} as any),
          id, type: 'geo', x, y,
          props: { geo: 'ellipse', w: 100, h: 100, color: 'red', fill: 'none', dash: 'draw' }
        });
        break;
      }
      case 'delete_shape': {
        if (action.id) {
          editor.deleteShapes([`shape:${action.id}` as TLShapeId]);
        } else {
          const shapes = editor.getCurrentPageShapes();
          editor.deleteShapes(shapes.map(s => s.id));
        }
        break;
      }

      case 'insert_thumbnail': {
        const queryText = encodeURIComponent(action.query || 'science');
        const imgUrl = `https://placehold.co/400x300/e0e7ff/4338ca?text=${queryText}`;
        editor.createShape({
          ...({} as any),
          id, type: 'image', x, y,
          props: { w, h, url: imgUrl }
        });
        break;
      }

      default:
        if (action.content) {
          editor.createShape({ ...({} as any), id, type: 'text', x, y, props: { richText: toRichText(action.content) } });
        }
    }
    await new Promise(r => setTimeout(r, 800));
  };

  // ── TTS (text chat fallback) ───────────────────────────────────────────────

  const speak = async (text: string): Promise<void> => {
    setIsSpeaking(true);
    return new Promise(async (resolve) => {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        if (!response.ok) throw new Error('TTS Failed');
        const data = await response.json();
        if (data.audioContent) {
          const audio = new window.Audio(`data:${data.mimeType || 'audio/wav'};base64,` + data.audioContent);
          audioRef.current = audio;
          audio.onended = () => { audioRef.current = null; setIsSpeaking(false); resolve(); };
          audio.onerror = () => { audioRef.current = null; setIsSpeaking(false); resolve(); };
          audio.play();
        } else { setIsSpeaking(false); resolve(); }
      } catch { setIsSpeaking(false); resolve(); }
    });
  };

  const stopSpeaking = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; }
    setIsSpeaking(false);
  };

  // ── Chat submit ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userText = input;
    const userImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);
    stopSpeaking();

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, text: userText, imageBase64: userImage }),
      });
      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      if (data.steps && Array.isArray(data.steps)) {
        for (const step of data.steps) {
          const drawPromise = step.board_action ? executeDrawAction(step.board_action) : Promise.resolve();
          const speakPromise = step.speech ? speak(step.speech) : Promise.resolve();
          await Promise.all([drawPromise, speakPromise]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────────

  const isSpeakingActive = isLive || isSpeaking;
  const micDenied = liveError === 'mic_denied';

  return (
    <div className="flex flex-col w-full h-full bg-slate-900 overflow-hidden" dir="rtl">

      {/* ══ TOP CONTROL BAR ══ */}
      <header
        className="h-14 flex-shrink-0 flex items-center justify-between px-4 z-30"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          borderBottom: '1px solid rgba(99,102,241,0.2)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.4)'
        }}
      >
        {/* LEFT: Avatar + speaking indicator */}
        <div className="flex items-center gap-3">
          {/* Professor Avatar */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${isSpeakingActive ? 'speaking-avatar' : ''}`}
            style={{
              background: isSpeakingActive
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'linear-gradient(135deg, #4338ca, #6366f1)',
              boxShadow: isSpeakingActive ? '0 0 0 3px rgba(99,102,241,0.4)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            أ
          </div>

          {/* Status text + sound bars */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">الأستاذ الافتراضي</span>
              {isLive && (
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'liveDot 1.2s ease-in-out infinite' }} />
                  مباشر
                </div>
              )}
              {isConnecting && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                  <Loader2 size={10} className="animate-spin" />
                  جارٍ الاتصال...
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isSpeakingActive ? (
                <>
                  <SoundWaveBars active={true} />
                  <span className="text-indigo-300 text-[11px]">يشرح...</span>
                </>
              ) : isLive ? (
                <>
                  <SoundWaveBars active={false} />
                  <span className="text-slate-400 text-[11px]">ينتظر سؤالك</span>
                </>
              ) : micDenied ? (
                <span className="text-amber-400 text-[11px]">تم رفض الميكروفون — استخدم الشات</span>
              ) : (
                <span className="text-slate-500 text-[11px]">غير متصل</span>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: current page name */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <span className="text-indigo-300 text-xs">
            {pages.find(p => p.id === currentPageId)?.title || 'الصفحة 1'}
          </span>
          <ChevronDown size={12} className="text-indigo-400" />
        </div>

        {/* RIGHT: controls */}
        <div className="flex items-center gap-2">
          {/* Mute / unmute */}
          {isLive && (
            <button
              onClick={toggleMute}
              title={isMuted ? 'تفعيل الميكروفون' : 'كتم الميكروفون'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: isMuted ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                border: isMuted ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(99,102,241,0.3)',
                color: isMuted ? '#fbbf24' : '#a5b4fc'
              }}
            >
              {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
              <span className="hidden sm:inline">{isMuted ? 'كتم' : 'مفعّل'}</span>
            </button>
          )}

          {/* End session */}
          {isLive && (
            <button
              onClick={endSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
            >
              <VolumeX size={14} />
              <span className="hidden sm:inline">إيقاف</span>
            </button>
          )}

          {/* Start session (if not live) */}
          {!isLive && !isConnecting && (
            <button
              onClick={() => startLive(sessionId || '')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}
            >
              <Mic size={14} />
              <span className="hidden sm:inline">بدء الصوت</span>
            </button>
          )}

          {/* Chat toggle */}
          <button
            onClick={() => setChatOpen(v => !v)}
            title="فتح/إغلاق الشات"
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: chatOpen ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#a5b4fc'
            }}
          >
            <MessageSquare size={14} />
            <span className="hidden sm:inline">شات</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="خروج"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(30,27,75,0.6)', border: '1px solid rgba(99,102,241,0.2)', color: '#94a3b8' }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ══ MAIN AREA ══ */}
      <div className="flex-1 relative flex w-full h-full overflow-hidden">

        {/* ── WHITEBOARD (100%) ── */}
        <div className="flex-1 relative w-full h-full z-10 touch-none" dir="ltr">
          <Tldraw persistenceKey="al-ostadh-board" shapeUtils={customShapeUtils}>
            <TldrawInside editorRef={editorRef} onEditorReady={handleEditorReady} />
          </Tldraw>
        </div>

        {/* ── CHAT PANEL (slide-in overlay) ── */}
        {chatOpen && (
          <div
            className="absolute top-0 left-0 bottom-0 w-80 z-50 flex flex-col chat-panel-enter"
            style={{
              background: 'rgba(15,23,42,0.92)',
              backdropFilter: 'blur(20px)',
              borderLeft: '1px solid rgba(99,102,241,0.25)',
              boxShadow: '4px 0 40px rgba(0,0,0,0.5)'
            }}
            dir="rtl"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-400" />
                <span className="text-white font-semibold text-sm">رسالة نصية</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Chat body — no message history, just input */}
            <div className="flex-1 flex flex-col justify-end p-4 gap-3">
              {micDenied && (
                <div className="p-3 rounded-xl text-xs"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                  تم رفض الميكروفون. يمكنك كتابة سؤالك هنا وسيشرح الأستاذ على السبورة.
                </div>
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-indigo-300 text-xs">
                  <Loader2 size={14} className="animate-spin" />
                  الأستاذ يكتب على السبورة...
                </div>
              )}

              {/* Image preview */}
              {selectedImage && (
                <div className="relative inline-block w-fit">
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-indigo-500/30" />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                    style={{ background: '#ef4444', color: 'white' }}
                  >×</button>
                </div>
              )}

              {/* Input form */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl transition-colors flex-shrink-0"
                  title="رفع صورة"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}
                >
                  <ImageIcon size={16} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="اكتب سؤالك..."
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={{
                    background: 'rgba(30,27,75,0.6)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    color: 'white',
                  }}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="p-2 rounded-xl transition-all disabled:opacity-40 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}
                >
                  <Volume2 size={16} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ══ BOTTOM PAGE BAR ══ */}
      <div
        className="h-11 flex-shrink-0 flex items-center px-3 gap-1 z-30 overflow-x-auto"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          borderTop: '1px solid rgba(99,102,241,0.2)',
        }}
        dir="ltr"
      >
        {pages.map((page, i) => {
          const isActive = page.id === currentPageId;
          return (
            <button
              key={page.id}
              onClick={() => switchToPage(page.id)}
              className="page-tab-enter flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(99,102,241,0.1)',
                color: isActive ? 'white' : '#94a3b8',
                border: isActive ? 'none' : '1px solid rgba(99,102,241,0.2)',
                boxShadow: isActive ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                transform: isActive ? 'translateY(-1px)' : 'none',
              }}
            >
              {page.title}
            </button>
          );
        })}

        {/* Add page button */}
        <button
          onClick={addPage}
          title="صفحة جديدة"
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px dashed rgba(99,102,241,0.3)',
            color: '#6366f1'
          }}
        >
          <Plus size={14} />
        </button>

        {/* Spacer + student name */}
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg flex-shrink-0"
          style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <span className="text-slate-400 text-[11px]">
            {session?.user?.user_metadata?.full_name || 'طالب'}
          </span>
        </div>
      </div>

      {/* Hidden file input (global) */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        id="global-file-input"
      />
    </div>
  );
}
