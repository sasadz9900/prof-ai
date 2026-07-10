import 'dotenv/config'; // تحميل متغيرات البيئة من ملف .env
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use('/media', express.static(path.join(process.cwd(), 'manimations', 'media')));

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;


  
  app.post('/api/tts', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'Missing text' });
      
      let finalAudioBase64: string | null = null;
      let finalMimeType = 'audio/wav';

      const styleInstruction = "الأسلوب المطلوب: ألقِ هذا النص بصوت رجل دافئ وواثق، بإيقاع طبيعي محادثاتي (ليس بطيئاً أو رتيباً)، كأستاذ متحمس يشرح لتلميذ يهتم به فعلاً، مع نبرة حماس عند النقاط المهمة.\n\nالنص: ";
      const ttsInput = styleInstruction + text;

      try {
        // Try the user's preferred gemini-3.1-flash-tts-preview model via interactions
        const ttsResponse = await ai.interactions.create({
          model: "gemini-3.1-flash-tts-preview",
          input: ttsInput,
          response_modalities: ["audio"],
        });
        
        for (const step of ttsResponse.steps || []) {
          if (step.type === 'model_output') {
            const audioContent = step.content?.find((c: any) => c.type === 'audio') as any;
            if (audioContent && audioContent.data) {
              finalAudioBase64 = audioContent.data;
              if (audioContent.mime_type) finalMimeType = audioContent.mime_type;
              break;
            }
          }
        }
        
        if (!finalAudioBase64) throw new Error('No audio returned from interactions API');
        
      } catch (interactionsError: any) {
        console.log('Interactions TTS failed (likely quota), falling back to Live API...', interactionsError.message);
        
        // Fallback to Live API
        const pcmBuffer = await new Promise<Buffer>(async (resolve, reject) => {
          try {
            let audioBuffer = Buffer.alloc(0);
            let timeoutId: ReturnType<typeof setTimeout>;
            let session = null; session = await ai.live.connect({
              model: "gemini-3.1-flash-live-preview",
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } },
systemInstruction: "أنت مجرد محول نص إلى صوت. الأسلوب المطلوب: ألقِ هذا النص بصوت رجل دافئ وواثق كأستاذ يشرح لتلميذ. قم بقراءة النص الذي يرسله المستخدم."
              },
              callbacks: {
                onmessage: (message) => {
                  console.log("Live API message received:", JSON.stringify(message).substring(0, 200));
                  const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                  if (audio) {
                    audioBuffer = Buffer.concat([audioBuffer, Buffer.from(audio, 'base64')]);
                  }
                  if (message.serverContent?.turnComplete) {
                    clearTimeout(timeoutId);
                    if(session) session.close();
                    resolve(audioBuffer);
                  }
                }
              }
            });
            timeoutId = setTimeout(() => {
               try { if(session) session.close(); } catch(e) {}
               reject(new Error("TTS Timeout"));
            }, 15000);
            session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true });
          } catch (err) {
            reject(err);
          }
        });

        if (pcmBuffer.length === 0) {
          throw new Error('No audio returned from Gemini Live TTS');
        }

        const sampleRate = 24000;
        const numChannels = 1;
        const bitDepth = 16;
            
        const wavBuffer = Buffer.alloc(44 + pcmBuffer.length);
            
        wavBuffer.write('RIFF', 0);
        wavBuffer.writeUInt32LE(36 + pcmBuffer.length, 4);
        wavBuffer.write('WAVE', 8);
            
        wavBuffer.write('fmt ', 12);
        wavBuffer.writeUInt32LE(16, 16);
        wavBuffer.writeUInt16LE(1, 20);
        wavBuffer.writeUInt16LE(numChannels, 22);
        wavBuffer.writeUInt32LE(sampleRate, 24);
        wavBuffer.writeUInt32LE(sampleRate * numChannels * (bitDepth / 8), 28);
        wavBuffer.writeUInt16LE(numChannels * (bitDepth / 8), 32);
        wavBuffer.writeUInt16LE(bitDepth, 34);
            
        wavBuffer.write('data', 36);
        wavBuffer.writeUInt32LE(pcmBuffer.length, 40);
            
        pcmBuffer.copy(wavBuffer, 44);
        
        finalAudioBase64 = wavBuffer.toString('base64');
        finalMimeType = 'audio/wav';
      }

      res.json({ audioContent: finalAudioBase64, mimeType: finalMimeType });
    } catch (e) {
      console.error('TTS Error:', e);
      res.status(500).json({ error: 'Failed to generate TTS' });
    }
  });

  // API Route for asking the tutor
  app.post('/api/ask', async (req, res) => {
    try {
      const { sessionId, text, imageBase64 } = req.body;
      
      if (!text && !imageBase64) {
        return res.status(400).json({ error: 'Missing input' });
      }

      let currentLessonState = { topic: null, phase: "not_started", current_step_index: 0, covered_points: [] };
      let previousMessages = [];

      if (supabase && sessionId) {
        // Fetch lesson state
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('lesson_state')
          .eq('id', sessionId)
          .single();
        if (sessionData && sessionData.lesson_state) {
          currentLessonState = typeof sessionData.lesson_state === 'string' ? JSON.parse(sessionData.lesson_state) : sessionData.lesson_state;
        }

        // Fetch messages
        const { data: msgs } = await supabase
          .from('messages')
          .select('role, content')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (msgs) {
          previousMessages = msgs;
        }

        // Save user message
        await supabase.from('messages').insert([{
          session_id: sessionId,
          role: 'user',
          content: text || '',
          image_url: imageBase64 || null
        }]);
      }

      const prompt = `أنت لست مجرد أداة تشرح معلومات - أنت أستاذ حقيقي له شخصية، حماس، ودفء إنساني حقيقي. تتصرف كأنك جالس فعلياً في نفس الغرفة مع تلميذك (سنة ثالثة ثانوي، علوم تجريبية، جزائري)، تهتم بنجاحه شخصياً.

عند بداية أي جلسة جديدة: رحّب بحرارة حقيقية، اسأل عن الدرس الذي يريد التلميذ تعلمه بفضول واهتمام حقيقي (وليس بجملة جامدة مكررة - نوّع في صياغة الترحيب كل مرة).

أسلوب الشرح:
- اشرح كأنك تخاطب تلميذاً يجد صعوبة في المادة، ويحتاج صبراً وتبسيطاً شديدين، وليس تلميذاً متفوقاً.
- استعمل دائماً مثالاً واقعياً ملموساً قبل أو بعد أي تعريف مجرد (لا تكتفِ بالتعريف النظري أبداً).
- أعط أكثر من مثال واحد إذا شعرت أن المفهوم معقد.
- تكلم بحرية وبأسلوب حواري طبيعي، ليس بجمل مكررة أو قوالب جامدة - نوّع تعابيرك، اطرح أسئلة فضولية، أظهر حماساً حقيقياً عند شرح نقطة مهمة أو معقدة.
- إذا التلميذ أجاب بشكل صحيح، افرح بصدق وشجّعه بعبارات متنوعة (ليس "ممتاز" في كل مرة).
- إذا أخطأ، لا تكن قاسياً، وضّح الخطأ بلطف وأعد الشرح بطريقة مختلفة عن المحاولة الأولى.
- استعمل لغة عربية فصحى مبسطة مع السماح ببعض المصطلحات الرياضية بالفرنسية (مثل lim, cos, f(x)).

قاعدة هامة جداً للسبورة:
لا تكتب على السبورة إلا ما يكتبه التلميذ حرفياً في كراسه: تعريف، قانون، صيغة رياضية، أو خطوة حل مرقّمة. 
أي شرح، توضيح، مثال شفوي، سؤال للتأكد من الفهم، أو كلام تحفيزي يجب أن يكون board_action: null — أي كلام فقط بدون كتابة. 
- أي صيغة رياضية (معادلة، دالة، قانون فيزيائي) يجب أن تُكتب بصيغة LaTeX عبر نوع write_formula، وليس كنص عادي داخل write_note. 
- النص العادي (write_note) يبقى فقط للجمل والتعاريف الكتابية غير الرمزية.

قواعد الألوان والرموز:
- أزرق (blue): تعاريف ومفاهيم جديدة
- أخضر (green): خطوات حل صحيحة / نتائج نهائية
- أحمر (red): تحذيرات، أخطاء شائعة، حالات خاصة يجب الانتباه لها
- بنفسجي (purple): أمثلة تطبيقية
- emphasis: "box": صيغ ونتائج نهائية مهمة توضع داخل مربع (لنوع write_note)
- emphasis: "underline": كلمات مفتاحية (لنوع write_note)
- connects_to: معرّف عنصر سابق على السبورة (string) لرسم سهم بينهما

قبل أن تولّد ردك، اتبع هذا التفكير الداخلي لكل جزء من الشرح:
1. ما الهدف من هذي اللحظة في الشرح؟ (تعريف / مثال واقعي / تأكد من الفهم)
2. هل هذا شيء يكتبه التلميذ في كراسه؟ 
   - لا -> "كلام فقط"، board_action = null
   - نعم -> انتقل للسؤال 3
3. أي نوع من الكتابة؟
   - نص كتابي -> write_note
   - صيغة رياضية/معادلة/قانون -> write_formula
   - سهم/شعاع فيزيائي -> draw_vector
   - دالة رياضية أو منحنى -> plot_function

اتبع هذا التفكير بصمت، ثم أخرج فقط الـ JSON.

مخرجاتك يجب أن تكون بصيغة JSON كالتالي:
{
  "steps": [
    {
      "speech": "النص الذي يُقرأ صوتياً",
      "board_action": null | {
        "type": "write_note" | "write_formula" | "plot_function" | "draw_shape" | "draw_vector",
        "id": "معرف_فريد",
        "content": "نص النقطة (لـ write_note فقط)",
        "latex": "u_{n+1} = u_n \\times q" (لـ write_formula فقط),
        "style": { "color": "blue"|"green"|"red"|"purple"|"black", "emphasis": "box"|"underline"|"none", "connects_to": "معرف_عنصر_سابق_أو_null" },
        "expression": "x^2 + 2x" (لـ plot_function),
        "domain": [-5, 5] (لـ plot_function),
        "color": "blue" (لـ plot_function أو draw_shape أو draw_vector أو write_formula),
        "from": [0,0] (لـ draw_vector),
        "to": [100,100] (لـ draw_vector),
        "label": "F" (لـ draw_vector)
      }
    }
  ]
}

أمثلة (Few-Shot):
مثال 1 (ترحيب دافئ ومثال واقعي):
{
  "speech": "[warmly] يا هلا بك يا بطل! يسعدني جداً أن نجلس معاً اليوم لنتعلم شيئاً جديداً. قل لي، ما هو الموضوع الذي تود أن نغوص فيه؟ هل لديك درس معين يزعجك؟",
  "board_action": null
}

مثال 2 (صيغة رياضية بـ LaTeX ومثال):
{
  "speech": "[engaged] تخيل معي أنك ترمي كرة من شرفة منزلك.. سرعة الكرة وهي تسقط تزيد، أليس كذلك؟ هذا التغير في السرعة هو ما نسميه بالتسارع! في الرياضيات والفيزياء، نعبر عن هذه التغيرات بما يسمى 'الاشتقاق'. دعنا نكتب رمز المشتقة.",
  "board_action": {
    "id": "deriv_def",
    "type": "write_formula",
    "latex": "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
    "color": "blue"
  }
}

مثال 3 (تأكيد الفهم مع تفاعل وتشجيع):
{
  "speech": "يا سلام عليك! إجابتك ذكية جداً وتدل على أنك استوعبت الفكرة تماماً. طيب، بما أنك فهمت هذا الجزء، هل تلاحظ كيف أن المنحنى ينزل للأسفل هنا؟ ماذا يعني هذا بالنسبة لإشارة المشتقة؟",
  "board_action": null
}`;

      const contents = [];
      if (imageBase64) {
        contents.push({
          inlineData: {
            data: imageBase64.split(',')[1],
            mimeType: imageBase64.split(';')[0].split(':')[1]
          }
        });
      }
      if (text) {
        contents.push({ text: text });
      }

      
      const geminiContents = [
        { role: 'user', parts: [{ text: prompt }] },
        ...previousMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        { role: 'user', parts: contents }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: geminiContents,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });

      let responseText = response.text || '';
      // clean up just in case
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
      }
      
      // Fix unescaped backslashes (common with LaTeX generated by AI)
      responseText = responseText.replace(/(?<!\\)(?:\\\\)*\\(?!["\\/nrtbf]|u[0-9a-fA-F]{4})/g, (match) => match + "\\");
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch(e) {
        console.error("JSON parse error:", e.message);
        console.error("Failing JSON segment:", responseText.substring(Math.max(0, parseInt(e.message.match(/position (\d+)/)?.[1] || 0) - 50), Math.min(responseText.length, parseInt(e.message.match(/position (\d+)/)?.[1] || 0) + 50)));
        throw e;
      }
      
      if (supabase && sessionId) {
        // save model response
        await supabase.from('messages').insert([{
          session_id: sessionId,
          role: 'model',
          content: responseText
        }]);
        
        // update lesson state
        if (parsedResponse.updated_lesson_state) {
          await supabase.from('sessions').update({
            lesson_state: parsedResponse.updated_lesson_state,
            updated_at: new Date().toISOString()
          }).eq('id', sessionId);
        }
      }

      res.json(parsedResponse);
    } catch (error: any) {
      console.error('Error generating tutor response:', error);
      res.status(500).json({ error: error.message || 'Failed to generate response' });
    }
  });

  // API Route for Manim Animation Generation
  app.post('/api/manim', async (req, res) => {
    const { code, id } = req.body;
    if (!code || !id) {
      return res.status(400).json({ error: 'Missing code or id' });
    }

    const manimDir = path.join(process.cwd(), 'manimations');
    const pyFileName = `temp_${id}.py`;
    const pyFilePath = path.join(manimDir, pyFileName);

    try {
      // Write the code to a temporary python file
      await fs.writeFile(pyFilePath, code, 'utf-8');

      // The manim command we run (using local uv environment)
      // -ql: low quality (480p15) for fast rendering
      // -qm: medium quality
      // --format mp4 (default)
      // output will go to manimations/media/videos/temp_{id}/480p15/GenScene.mp4 (default scene name must be GenScene)
      const cmd = `"${path.join(process.env.USERPROFILE || 'C:\\Users\\MED HIGH TECH', '.local', 'bin', 'uv.exe')}" run manim ${pyFileName} GenScene -ql`;

      exec(cmd, { cwd: manimDir, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }, (error, stdout, stderr) => {
        if (error) {
          console.error('Manim error:', stderr);
          return res.status(500).json({ error: 'Failed to generate animation', details: stderr });
        }
        
        // Output video path (relative for URL)
        // Manim puts it in media/videos/{filename}/{quality}/{SceneName}.mp4
        const videoUrl = `/media/videos/temp_${id}/480p15/GenScene.mp4`;
        res.json({ videoUrl });
      });
    } catch (e: any) {
      console.error('Manim API Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // API Route for live token
  app.get('/api/live-token', (req, res) => {
    // ⚠️  تحذير أمني: هذا يُرسل مفتاح API مباشرة إلى المتصفح.
    // في بيئة الإنتاج الحقيقية، يجب استبداله بـ Ephemeral Tokens
    // أو استخدام WebSocket proxy server-side لتجنب كشف المفتاح.
    res.json({ token: process.env.GEMINI_API_KEY });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
