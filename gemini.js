// gemini.js
(async () => {
  if (!window._geminiRecorder) {
    window._geminiRecorder = { recording: false, chunks: [], mediaRecorder: null };
  }
  const s = window._geminiRecorder;
  let k = localStorage.getItem("gemini_api_key");
  if (!k) {
    k = prompt("Enter Gemini API Key:");
    if (!k) return;
    localStorage.setItem("gemini_api_key", k);
  }

  if (!s.recording) {
    try {
      if (s.mediaRecorder) {
        try {
          s.mediaRecorder.onstop = null;
          s.mediaRecorder.stream.getTracks().forEach(t => t.stop());
        } catch (e) {}
      }
      const m = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(m);
      s.chunks = [];
      r.ondataavailable = e => s.chunks.push(e.data);
      r.onstop = async () => {
        try {
          const b = new Blob(s.chunks, { type: "audio/webm" });
          s.mediaRecorder = null;
          m.getTracks().forEach(t => t.stop());
          if (b.size < 1024) {
            alert("Recording too short (<1s). Try again.");
            return;
          }
          const reader = new FileReader();
          reader.readAsDataURL(b);
          await new Promise(resolve => (reader.onload = resolve));
          const d = reader.result.split(",")[1];
          const x = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
              k,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text:
                          "Transcribe this audio to text accurately. Return ONLY the plain transcription text, no additional words, formatting, or explanations:",
                        inline_data: { mime_type: "audio/webm", data: d },
                      },
                    ],
                  },
                ],
                generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
              }),
            }
          );
          const j = await x.json();
          const t =
            j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "(no text)";
          const f = document.activeElement;
          if (
            f &&
            (f.tagName === "INPUT" || f.tagName === "TEXTAREA" || f.isContentEditable)
          ) {
            if ("value" in f) f.value += (f.value ? " " : "") + t;
            else f.innerText += (f.innerText ? " " : "") + t;
            f.dispatchEvent(new Event("input", { bubbles: true }));
          } else alert("Result: " + t);
        } catch (e) {
          alert("Processing error: " + e.message);
        }
      };
      r.start();
      s.mediaRecorder = r;
      s.recording = true;
      alert("🎤 Recording started... click again to stop");
    } catch (e) {
      alert("Mic error: " + e);
    }
    return;
  }

  s.recording = false;
  if (s.mediaRecorder) s.mediaRecorder.stop();
})();
