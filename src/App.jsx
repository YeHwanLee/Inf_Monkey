import React, { useRef, useState } from 'react';
import MonkeyCanvas from './components/MonkeyCanvas';
import { generateAttempt } from './utils/storyEngine.js';

export default function App() {
  const canvasComponentRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);

  // 🐒 타자기(⌨️)와 원숭이(🐒)가 나란히 있는 듀얼 이모티콘 스킨!
  const defaultCharacter =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='35' y='55' dominant-baseline='central' text-anchor='middle' font-size='40'>⌨️</text><text x='75' y='50' dominant-baseline='central' text-anchor='middle' font-size='45'>🐒</text></svg>"
    );
  const [characterSrc, setCharacterSrc] = useState(defaultCharacter);

  const defaultProp =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB4PSI1MCIgeT0iNTAiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjgwIj7wn42MPC90ZXh0Pjwvc3ZnPg==';
  const [propSrc, setPropSrc] = useState(defaultProp);

  // 🎵 오디오 기본 경로를 public 폴더의 mp3 파일로 하드코딩
  const [seaAudioSrc, setSeaAudioSrc] = useState('/sea.mp3');
  const [typeAudioSrc, setTypeAudioSrc] = useState('/type.mp3');

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
    const videoStream = canvas.captureStream(30);

    const audioTrack = canvasComponentRef.current.getAudioTrack();

    const combinedStream = new MediaStream();
    videoStream
      .getVideoTracks()
      .forEach((track) => combinedStream.addTrack(track));
    if (audioTrack) {
      combinedStream.addTrack(audioTrack);
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
              style={{
                color:
                  seaAudioSrc && seaAudioSrc !== '/sea.mp3'
                    ? '#34d399'
                    : '#e2e8f0',
              }}
            >
              {seaAudioSrc && seaAudioSrc !== '/sea.mp3'
                ? '🎵 커스텀 바다 사운드 장전'
                : '🌊 기본 바다 소리 적용중'}
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
              style={{
                color:
                  typeAudioSrc && typeAudioSrc !== '/type.mp3'
                    ? '#34d399'
                    : '#e2e8f0',
              }}
            >
              {typeAudioSrc && typeAudioSrc !== '/type.mp3'
                ? '🎵 커스텀 타격음 장전'
                : '⌨️ 기본 타격음 적용중'}
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
