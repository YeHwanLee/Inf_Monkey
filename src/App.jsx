import React, { useRef, useState } from 'react';
import MonkeyCanvas from './components/MonkeyCanvas';
import { generateAttempt } from './utils/storyEngine.js';

export default function App() {
  const canvasComponentRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);

  // 🐒 기본 스킨: 회색 원이 아닌 '원숭이 이모티콘' SVG
  const defaultCharacter =
    "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext x='50' y='50' dominant-baseline='central' text-anchor='middle' font-size='80'%3E%F0%9F%90%92%3C/text%3E%3C/svg%3E";
  const [characterSrc, setCharacterSrc] = useState(defaultCharacter);

  const defaultProp =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB4PSI1MCIgeT0iNTAiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjgwIj7wn42MPC90ZXh0Pjwvc3ZnPg==';
  const [propSrc, setPropSrc] = useState(defaultProp);

  const [storyData, setStoryData] = useState(generateAttempt());

  const [attemptNumber, setAttemptNumber] = useState(() => {
    const saved = localStorage.getItem('monkeyAttempt');
    return saved ? parseInt(saved, 10) : 1;
  });

  const handleCharFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setCharacterSrc(URL.createObjectURL(file));
  };

  const handlePropFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setPropSrc(URL.createObjectURL(file));
  };

  const handleAttemptChange = (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    setAttemptNumber(val);
    localStorage.setItem('monkeyAttempt', val.toString());
  };

  // ▶️ 새로 추가된 '미리보기' (녹화 없이 화면만 재생)
  const handlePreview = () => {
    if (isRendering) return;
    setStoryData(generateAttempt());
    if (canvasComponentRef.current) {
      canvasComponentRef.current.resetAnimation();
    }
  };

  const handleRenderVideo = () => {
    if (!canvasComponentRef.current || isRendering) return;

    const currentAttempt = attemptNumber;

    // 렌더링 시작 시에도 새로운 텍스트로 갱신
    setStoryData(generateAttempt());
    canvasComponentRef.current.resetAnimation();

    const canvas = canvasComponentRef.current.getCanvas();
    const stream = canvas.captureStream(30);

    const options = {
      mimeType: 'video/webm; codecs=vp9',
      videoBitsPerSecond: 8000000,
    };
    const recorder = new MediaRecorder(stream, options);
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monkey_attempt_${currentAttempt}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setIsRendering(false);
      setProgress(0);

      const nextAttempt = currentAttempt + 1;
      setAttemptNumber(nextAttempt);
      localStorage.setItem('monkeyAttempt', nextAttempt.toString());
    };

    setIsRendering(true);
    setProgress(0);

    requestAnimationFrame(() => {
      recorder.start();
      const TARGET_DURATION = 12000;
      const startTime = performance.now();

      const monitorProgress = (currentTime) => {
        const elapsed = currentTime - startTime;
        const currentProgress = Math.min(
          Math.round((elapsed / TARGET_DURATION) * 100),
          100
        );
        setProgress((prev) =>
          prev !== currentProgress ? currentProgress : prev
        );

        if (elapsed >= TARGET_DURATION) {
          recorder.stop();
        } else {
          requestAnimationFrame(monitorProgress);
        }
      };
      requestAnimationFrame(monitorProgress);
    });
  };

  return (
    <div className="workspace">
      <div className="control-panel">
        <h1 className="title">Monkey Typing Simulator</h1>

        <div className="section">
          <label className="label">1. 캐릭터 스킨 (기본: 🐒)</label>
          <div className="file-upload-wrapper">
            <input
              type="file"
              id="char-file"
              accept="image/*"
              className="input-file-hidden"
              onChange={handleCharFileChange}
            />
            <label htmlFor="char-file" className="file-custom-btn">
              📁 캐릭터 PNG 선택
            </label>
          </div>
        </div>

        <div className="section">
          <label className="label">2. PPL 소품 스킨 (기본: 🍌)</label>
          <div className="file-upload-wrapper">
            <input
              type="file"
              id="prop-file"
              accept="image/*"
              className="input-file-hidden"
              onChange={handlePropFileChange}
            />
            <label htmlFor="prop-file" className="file-custom-btn">
              📁 소품 PNG 선택
            </label>
          </div>
        </div>

        <div className="section">
          <label className="label">3. 현재 시도 횟수</label>
          <input
            type="number"
            className="file-custom-btn"
            style={{
              textAlign: 'left',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
            }}
            value={attemptNumber}
            onChange={handleAttemptChange}
          />
        </div>

        {/* ▶️ UI: 미리보기 버튼과 렌더링 버튼 나란히 배치 */}
        <div className="section">
          <label className="label">4. 12초 시퀀스 제어</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="file-custom-btn"
              onClick={handlePreview}
              disabled={isRendering}
              style={{
                flex: 1,
                backgroundColor: '#334155',
                border: 'none',
                fontWeight: 'bold',
              }}
            >
              ▶️ 미리보기
            </button>
            <button
              className={`render-btn ${isRendering ? 'active' : ''}`}
              onClick={handleRenderVideo}
              disabled={isRendering}
              style={{ flex: 2 }}
            >
              {isRendering ? `⏳ 렌더링 중... (${progress}%)` : '🎬 영상 추출'}
            </button>
          </div>
        </div>
      </div>

      <div className="render-zone">
        <div className="reels-viewport">
          <MonkeyCanvas
            ref={canvasComponentRef}
            characterSrc={characterSrc}
            propSrc={propSrc}
            storyData={storyData}
            attemptNumber={attemptNumber}
          />
        </div>
      </div>
    </div>
  );
}
