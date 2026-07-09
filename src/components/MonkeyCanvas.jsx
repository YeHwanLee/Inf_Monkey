import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { propConfigs } from '../utils/propManager';

const MonkeyCanvas = forwardRef(
  (
    {
      characterSrc,
      propSrc,
      seaAudioSrc,
      typeAudioSrc,
      storyData,
      attemptNumber,
    },
    ref
  ) => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const startTimeRef = useRef(null);

    const imgRef = useRef(null);
    const propImgRef = useRef(null);

    // 🎵 오디오 하드웨어 브릿지 락(Lock) 레퍼런스 구조화
    const seaAudioRef = useRef(null);
    const typeAudioRef = useRef(null);
    const audioCtxRef = useRef(null);
    const audioDestRef = useRef(null);
    const lastLettersCountRef = useRef(0);

    useEffect(() => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = characterSrc;
      img.onload = () => {
        imgRef.current = img;
      };
    }, [characterSrc]);

    useEffect(() => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = propSrc;
      img.onload = () => {
        propImgRef.current = img;
      };
    }, [propSrc]);

    // 🛠️ 브라우저 엔진 버그 원천 진압: 오디오 컨텍스트 및 소스노드는 평생 '단 1번'만 생성합니다.
    const initAudioEngine = () => {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        audioDestRef.current =
          audioCtxRef.current.createMediaStreamDestination();

        // 1. 바다 소리 객체 생성 및 엔진 바인딩
        const sea = new Audio();
        sea.loop = true;
        seaAudioRef.current = sea;
        const seaSource = audioCtxRef.current.createMediaElementSource(sea);
        seaSource.connect(audioCtxRef.current.destination);
        seaSource.connect(audioDestRef.current);

        // 2. 타자기 소리 객체 생성 및 엔진 바인딩
        const type = new Audio();
        typeAudioRef.current = type;
        const typeSource = audioCtxRef.current.createMediaElementSource(type);
        typeSource.connect(audioCtxRef.current.destination);
        typeSource.connect(audioDestRef.current);
      }
    };

    // 주소가 변경될 때 노드를 재생성하지 않고 내부 경로(.src)만 스마트하게 스위칭하여 크래시 방지
    useEffect(() => {
      if (!seaAudioSrc) return;
      initAudioEngine();
      seaAudioRef.current.src = seaAudioSrc;
      seaAudioRef.current.load();
    }, [seaAudioSrc]);

    useEffect(() => {
      if (!typeAudioSrc) return;
      initAudioEngine();
      typeAudioRef.current.src = typeAudioSrc;
      typeAudioRef.current.load();
    }, [typeAudioSrc]);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      getAudioTrack: () =>
        audioDestRef.current
          ? audioDestRef.current.stream.getAudioTracks()[0]
          : null,
      resetAnimation: () => {
        startTimeRef.current = null;
        lastLettersCountRef.current = 0;

        // 브라우저의 강제 자동재생 수면 상태 깨우기
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }

        if (seaAudioRef.current && seaAudioRef.current.src) {
          seaAudioRef.current.currentTime = 0;
          seaAudioRef.current.volume = 0;
          seaAudioRef.current
            .play()
            .catch((e) => console.warn('오디오 파이프라인 우회중...', e));
        }
      },
    }));

    const T_INTRO = 2.0;
    const T_IRIS_OPEN = 3.5;
    const T_TYPING_START = 5.0;
    const T_TYPING_END = 10.0;
    const T_IRIS_CLOSE_START = 10.5;
    const T_IRIS_CLOSE_END = 12.0;
    const T_OUTRO_START = 12.3;
    const T_FADE_OUT = 14.0;
    const T_TOTAL = 15.0;

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = 1080;
      canvas.height = 1920;

      const render = (timestamp) => {
        if (!storyData) {
          requestRef.current = requestAnimationFrame(render);
          return;
        }

        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = (timestamp - startTimeRef.current) / 1000;

        // 🌊 바다 오디오 볼륨 페이드 오토메이션
        if (seaAudioRef.current && seaAudioRef.current.src) {
          if (elapsed < T_INTRO) {
            seaAudioRef.current.volume = 0;
          } else if (elapsed >= T_INTRO && elapsed < T_IRIS_OPEN) {
            const vol = (elapsed - T_INTRO) / (T_IRIS_OPEN - T_INTRO);
            seaAudioRef.current.volume = Math.min(1, Math.max(0, vol));
          } else if (elapsed >= T_IRIS_OPEN && elapsed < T_IRIS_CLOSE_START) {
            seaAudioRef.current.volume = 1;
          } else if (
            elapsed >= T_IRIS_CLOSE_START &&
            elapsed < T_IRIS_CLOSE_END
          ) {
            const vol =
              1 -
              (elapsed - T_IRIS_CLOSE_START) /
                (T_IRIS_CLOSE_END - T_IRIS_CLOSE_START);
            seaAudioRef.current.volume = Math.min(1, Math.max(0, vol));
          } else {
            seaAudioRef.current.volume = 0;
          }
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#7dd3fc');
        gradient.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const loopDuration = 3;
        const t = elapsed % loopDuration;
        const waveSpeed = (2 * Math.PI) / loopDuration;
        const bobSpeed = (4 * Math.PI) / loopDuration;

        // 뒤쪽 파도
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width; x++)
          ctx.lineTo(
            x,
            canvas.height * 0.58 + Math.sin(x * 0.008 + t * waveSpeed) * 12
          );
        ctx.lineTo(canvas.width, canvas.height);
        ctx.fill();

        // 캐릭터 렌더링
        if (imgRef.current) {
          ctx.save();
          ctx.translate(
            canvas.width / 2,
            canvas.height * 0.57 + Math.sin(t * bobSpeed) * 15
          );
          ctx.rotate(Math.cos(t * bobSpeed) * 0.02);
          ctx.drawImage(imgRef.current, -250, -250, 500, 500);
          ctx.restore();
        }

        // 중간 파도
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width; x++)
          ctx.lineTo(
            x,
            canvas.height * 0.61 + Math.sin(x * 0.012 - t * waveSpeed) * 14
          );
        ctx.lineTo(canvas.width, canvas.height);
        ctx.fill();

        // PPL 소품
        if (
          elapsed > T_INTRO &&
          elapsed < T_IRIS_CLOSE_END &&
          propImgRef.current
        ) {
          propConfigs.forEach((config) => {
            ctx.save();
            const propX = canvas.width / 2 + config.xOffset;
            const propY =
              canvas.height * 0.67 +
              config.yOffset +
              Math.sin(propX * 0.01 + t * waveSpeed + config.phaseShift) *
                (14 * config.mass);

            ctx.translate(propX, propY);
            ctx.rotate(Math.cos(t * bobSpeed + config.phaseShift) * 0.08);
            ctx.drawImage(
              propImgRef.current,
              -config.size / 2,
              -config.size / 2,
              config.size,
              config.size
            );
            ctx.restore();
          });
        }

        // 앞쪽 파도 (0.72 수위 고정)
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width; x++)
          ctx.lineTo(
            x,
            canvas.height * 0.72 + Math.sin(x * 0.015 + t * waveSpeed * 2) * 18
          );
        ctx.lineTo(canvas.width, canvas.height);
        ctx.fill();

        // 타자기 텍스트 인터페이스
        const startY = 400;
        const letterSpacing = 85;
        const typingPointX = canvas.width / 2 + 250;

        if (elapsed > T_INTRO && elapsed < T_IRIS_CLOSE_END) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(0, startY - 75, canvas.width, 130);
        }

        if (elapsed > T_INTRO && elapsed < T_IRIS_CLOSE_END) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(150, 0, canvas.width - 300, canvas.height); // 좌우 150px 황금 대칭 가림막
          ctx.clip();

          ctx.font = "bold 110px 'Special Elite', monospace";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          let lettersToShow = 0;
          let typeProgress = 0;

          if (elapsed > T_TYPING_START) {
            typeProgress = Math.min(
              (elapsed - T_TYPING_START) / (T_TYPING_END - T_TYPING_START),
              1
            );
            lettersToShow = Math.floor(typeProgress * 20);
          }

          // 🎯 대표님이 찾으신 황금 싱크 오프셋 '0.17초' 선행 타격 물리 고정!
          const audioOffset = 0.17;
          let audioElapsed = elapsed + audioOffset;
          let audioLettersToPlay = 0;

          if (audioElapsed > T_TYPING_START) {
            let audioTypeProgress = Math.min(
              (audioElapsed - T_TYPING_START) / (T_TYPING_END - T_TYPING_START),
              1
            );
            audioLettersToPlay = Math.floor(audioTypeProgress * 20);
          }

          // 안정적인 사운드 타격
          if (
            audioLettersToPlay > lastLettersCountRef.current &&
            typeAudioRef.current &&
            typeAudioRef.current.src
          ) {
            typeAudioRef.current.currentTime = 0;
            typeAudioRef.current.play().catch(() => {});
            lastLettersCountRef.current = audioLettersToPlay;
          }

          for (let i = 0; i < lettersToShow; i++) {
            const letter = storyData.text[i];
            const distanceToLatest = lettersToShow - 1 - i;
            const x = typingPointX - distanceToLatest * letterSpacing;

            let popY = 0;
            if (i === lettersToShow - 1) {
              const age = typeProgress * 20 - i;
              if (age < 0.5) popY = Math.sin((age / 0.5) * Math.PI) * -35;
            }

            ctx.fillStyle = '#f8fafc';
            ctx.fillText(letter, x, startY + popY);
          }

          if (elapsed > T_IRIS_OPEN - 0.2 && elapsed < T_IRIS_CLOSE_START) {
            if (Math.floor(elapsed * 4) % 2 === 0) {
              ctx.fillStyle = '#38bdf8';
              ctx.fillText('_', typingPointX + letterSpacing, startY - 15);
            }
          }

          ctx.restore();
        }

        // 아이리스 연출
        let irisRadius = Math.max(canvas.width, canvas.height);
        if (elapsed < T_INTRO || elapsed >= T_IRIS_CLOSE_END) {
          irisRadius = 0;
        } else if (elapsed >= T_INTRO && elapsed < T_IRIS_OPEN) {
          irisRadius =
            Math.sin(
              ((elapsed - T_INTRO) / (T_IRIS_OPEN - T_INTRO)) * (Math.PI / 2)
            ) * Math.max(canvas.width, canvas.height);
        } else if (
          elapsed >= T_IRIS_CLOSE_START &&
          elapsed < T_IRIS_CLOSE_END
        ) {
          irisRadius =
            (1 -
              Math.sin(
                ((elapsed - T_IRIS_CLOSE_START) /
                  (T_IRIS_CLOSE_END - T_IRIS_CLOSE_START)) *
                  (Math.PI / 2)
              )) *
            Math.max(canvas.width, canvas.height);
        }

        ctx.fillStyle = '#0b0f19';
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.arc(
          canvas.width / 2,
          canvas.height / 2,
          irisRadius,
          0,
          Math.PI * 2,
          true
        );
        ctx.fill();

        // 결과 화면 오버레이
        ctx.textAlign = 'center';

        if (elapsed < T_INTRO) {
          ctx.font = "900 70px 'Montserrat', sans-serif";
          ctx.fillStyle = '#f1f5f9';
          ctx.fillText(
            `ATTEMPT #${attemptNumber}`,
            canvas.width / 2,
            canvas.height / 2 - 50
          );

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.arc(
            canvas.width / 2,
            canvas.height / 2 + 80,
            40,
            elapsed * 5,
            elapsed * 5 + Math.PI
          );
          ctx.stroke();
        }

        if (elapsed > T_OUTRO_START && elapsed < T_TOTAL) {
          const outroAge = elapsed - T_OUTRO_START;

          let alpha = 1.0;
          if (elapsed > T_FADE_OUT) {
            alpha = Math.max(
              0,
              1 - (elapsed - T_FADE_OUT) / (T_TOTAL - T_FADE_OUT)
            );
          }
          ctx.globalAlpha = alpha;

          const scale = outroAge < 0.2 ? 1 + (0.2 - outroAge) * 3 : 1;

          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2 - 100);
          ctx.scale(scale, scale);

          const bestSubstring = storyData.text.substring(
            storyData.bestMatchIndex,
            storyData.bestMatchIndex + 6
          );

          ctx.font = "bold 150px 'Special Elite', monospace";
          const letterSpacing = 110;
          const startX = -((6 - 1) * letterSpacing) / 2;

          for (let i = 0; i < 6; i++) {
            const char = bestSubstring[i];
            const isMatch = char === 'BANANA'[i];
            ctx.fillStyle = isMatch ? '#22c55e' : '#475569';
            ctx.fillText(char, startX + i * letterSpacing, 0);
          }
          ctx.restore();

          ctx.font = "900 90px 'Montserrat', sans-serif";
          ctx.fillStyle = storyData.matchRate > 0 ? '#22c55e' : '#f8fafc';

          if (outroAge > 0.3) {
            ctx.fillText(
              `MATCH: ${storyData.matchRate}%`,
              canvas.width / 2,
              canvas.height / 2 + 150
            );
          }

          ctx.globalAlpha = 1.0;
        }

        requestRef.current = requestAnimationFrame(render);
      };

      requestRef.current = requestAnimationFrame(render);
      return () => cancelAnimationFrame(requestRef.current);
    }, [characterSrc, propSrc, storyData, attemptNumber]);

    return <canvas ref={canvasRef} className="render-canvas" />;
  }
);

export default MonkeyCanvas;
