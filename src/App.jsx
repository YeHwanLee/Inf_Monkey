import React, { useRef, useState } from 'react';
import MonkeyCanvas from './components/MonkeyCanvas';
import { generateAttempt } from './utils/storyEngine.js';

export default function App() {
  const canvasComponentRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);

  // 📁 스킨 이미지 상태
  const defaultCharacter =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB4PSI1MCIgeT0iNTAiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjgwIj7wn5CSPC90ZXh0Pjwvc3ZnPg==';
  const [characterSrc, setCharacterSrc] = useState(defaultCharacter);

  const defaultProp =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB4PSI1MCIgeT0iNTAiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjgwIj7wn42MPC90ZXh0Pjwvc3ZnPg==';
  const [propSrc, setPropSrc] = useState(defaultProp);

  // 🎵 오디오 파일 상태 (추가)
  const [seaAudioSrc, setSeaAudioSrc] = useState(null);
  const [typeAudioSrc, setTypeAudioSrc] = useState(null);

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

  // 오디오 등록 핸들러 (추가)
  const handleSeaAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) setSeaAudioSrc(URL.createObjectURL(file));
  };

  const handleTypeAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) setTypeAudioSrc(URL.createObjectURL(file));
  };

  const handleAttemptChange = (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    setAttemptNumber(val);
    localStorage.setItem('monkeyAttempt', val.toString());
  };

  const handlePreview = () => {
    if (!canvasComponentRef.current || isRendering) return;
    setStoryData(generateAttempt());
    canvasComponentRef.current.resetAnimation();
  };

  const handleRenderVideo = () => {
    if (!canvasComponentRef.current) return;

    const currentAttempt = attemptNumber;
    setStoryData(generateAttempt());
    canvasComponentRef.current.resetAnimation();

    const canvas = canvasComponentRef.current.getCanvas();
    const videoStream = canvas.captureStream(30); // 비디오 트랙 캡처

    // 🎤 캔버스 컴포넌트 내부에서 연동된 오디오 트랙 추출
    const audioTrack = canvasComponentRef.current.getAudioTrack();

    const combinedStream = new MediaStream();
    videoStream
      .getVideoTracks()
      .forEach((track) => combinedStream.addTrack(track));
    if (audioTrack) {
      combinedStream.addTrack(audioTrack); // 오디오 트랙이 존재하면 비디오와 결합!
    }

    const options = {
      mimeType: 'video/webm; codecs=vp9',
      videoBitsPerSecond: 8000000,
    };
    const recorder = new MediaRecorder(combinedStream, options);
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
      // 🔥 12초에서 시네마틱 15초(15000ms)로 리텐션 타임라인 확장!
      const TARGET_DURATION = 15000;
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
      <div className="control-panel" style={{ overflowY: 'auto' }}>
        <h1 className="title">Monkey Typing Simulator</h1>

        <div className="section">
          <label className="label">1. 캐릭터 스킨 업로드</label>
          <div className="file-upload-wrapper">
            <input
              type="file"
              id="char-file"
              accept="image/*"
              className="input-file-hidden"
              onChange={handleCharFileChange}
            />
            <label htmlFor="char-file" className="file-custom-btn">
              🐒 캐릭터 PNG 선택
            </label>
          </div>
        </div>

        <div className="section">
          <label className="label">2. PPL 소품 스킨 업로드</label>
          <div className="file-upload-wrapper">
            <input
              type="file"
              id="prop-file"
              accept="image/*"
              className="input-file-hidden"
              onChange={handlePropFileChange}
            />
            <label htmlFor="prop-file" className="file-custom-btn">
              🍌 소품 PNG 선택
            </label>
          </div>
        </div>

        {/* 🎵 오디오 소스 사운드 파일 업로드 패널 추가 */}
        <div className="section">
          <label className="label">3. 바다 환경음 등록 (.mp3)</label>
          <div className="file-upload-wrapper">
            <input
              type="file"
              id="sea-audio"
              accept="audio/*"
              className="input-file-hidden"
              onChange={handleSeaAudioChange}
            />
            <label
              htmlFor="sea-audio"
              className="file-custom-btn"
              style={{ color: seaAudioSrc ? '#34d399' : '#e2e8f0' }}
            >
              {seaAudioSrc
                ? '🎵 바다 사운드 장전 완료'
                : '🌊 바다 소리 파일 선택'}
            </label>
          </div>
        </div>

        <div className="section">
          <label className="label">4. 타자기 타격음 등록 (.mp3)</label>
          <div className="file-upload-wrapper">
            <input
              type="file"
              id="type-audio"
              accept="audio/*"
              className="input-file-hidden"
              onChange={handleTypeAudioChange}
            />
            <label
              htmlFor="type-audio"
              className="file-custom-btn"
              style={{ color: typeAudioSrc ? '#34d399' : '#e2e8f0' }}
            >
              {typeAudioSrc
                ? '🎵 타자기 사운드 장전 완료'
                : '⌨️ 타자기 소리 파일 선택'}
            </label>
          </div>
        </div>

        <div className="section">
          <label className="label">5. 현재 시도 횟수</label>
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
            disabled={isRendering}
          />
        </div>

        <div className="section">
          <label className="label">6. 테스트 뷰 (인코딩 X)</label>
          <button
            className="file-custom-btn"
            style={{
              backgroundColor: '#4f46e5',
              borderColor: '#4338ca',
              color: 'white',
              fontWeight: 'bold',
            }}
            onClick={handlePreview}
            disabled={isRendering}
          >
            ▶️ 미리보기 재생
          </button>
        </div>

        <div className="section">
          <label className="label">7. 비디오 출력 (15초 시네마틱 루프)</label>
          <button
            className={`render-btn ${isRendering ? 'active' : ''}`}
            onClick={handleRenderVideo}
            disabled={isRendering}
          >
            {isRendering
              ? `⏳ 렌더링 중... (${progress}%)`
              : '🎬 시뮬레이션 가동 & 렌더링'}
          </button>
          {isRendering && (
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      <div className="render-zone">
        <div className="reels-viewport">
          {/* 오디오 소스 패스 인 */}
          <MonkeyCanvas
            ref={canvasComponentRef}
            characterSrc={characterSrc}
            propSrc={propSrc}
            seaAudioSrc={seaAudioSrc}
            typeAudioSrc={typeAudioSrc}
            storyData={storyData}
            attemptNumber={attemptNumber}
          />
        </div>
      </div>
    </div>
  );
}
