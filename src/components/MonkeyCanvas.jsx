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

    // 🎵 오디오 관련 하드웨어 엘리먼트 레퍼런스
    const seaAudioRef = useRef(null);
    const typeAudioRef = useRef(null);
    const audioCtxRef = useRef(null);
    const audioDestRef = useRef(null);
    const lastLettersCountRef = useRef(0); // 타자기 사운드 중복 타격 방지 감시카메라

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

    // 오디오 오토메이션 노드 초기화 및 믹싱 아키텍처
    useEffect(() => {
      if (!seaAudioSrc) return;

      // 오디오 컨텍스트가 없으면 생성 (비디오 추출 믹싱용 두뇌)
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        audioDestRef.current =
          audioCtxRef.current.createMediaStreamDestination();
      }

      const audio = new Audio(seaAudioSrc);
      audio.loop = true;
      audio.crossOrigin = 'anonymous';
      seaAudioRef.current = audio;

      // 미디어 요소를 오디오 그래픽 노드에 바인딩하여 추출 파이프라인에 연결
      const source = audioCtxRef.current.createMediaElementSource(audio);
      source.connect(audioCtxRef.current.destination); // 스피커 출력
      source.connect(audioDestRef.current); // 녹화용 비디오 믹서로 바이패스

      return () => {
        audio.pause();
      };
    }, [seaAudioSrc]);

    useEffect(() => {
      if (!typeAudioSrc) return;
      const audio = new Audio(typeAudioSrc);
      audio.crossOrigin = 'anonymous';
      typeAudioRef.current = audio;

      if (audioCtxRef.current && audioDestRef.current) {
        const source = audioCtxRef.current.createMediaElementSource(audio);
        source.connect(audioCtxRef.current.destination);
        source.connect(audioDestRef.current);
      }
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
        if (seaAudioRef.current) {
          seaAudioRef.current.currentTime = 0;
          seaAudioRef.current.volume = 0;
          seaAudioRef.current.play().catch(() => {});
        }
      },
    }));

    // ⏱️ 여유롭고 숨막히는 시네마틱 15초 타임라인 큐시트 재정렬
    const T_INTRO = 2.0; // 인트로 연장 (1.0 -> 2.0초)
    const T_IRIS_OPEN = 3.5; // 1.5초 동안 초스무스하게 아이리스 오픈
    const T_TYPING_START = 5.0; // 1.5초간 커서만 깜빡이며 숨고르기 타임 ("어? 뭐지?" 구간 극대화)
    const T_TYPING_END = 10.0; // 5.0초 동안 한 글자씩 쫀득하고 느릿하게 타다닥 타이핑 (가독성 최상)
    const T_IRIS_CLOSE_START = 10.5; // 다 치고 0.5초 대기
    const T_IRIS_CLOSE_END = 12.0; // 1.5초 동안 초스무스하게 아이리스 클로즈
    const T_OUTRO_START = 12.3;
    const T_FADE_OUT = 14.0; // 정답 노출 시간 대폭 연장 (여운 시스템)
    const T_TOTAL = 15.0; // 완벽한 루프 안착을 위한 마무리 페이드아웃

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

        // 🎛️ 사운드 볼륨 오토메이션 페이더 연산 로직
        if (seaAudioRef.current) {
          if (elapsed < T_INTRO) {
            seaAudioRef.current.volume = 0;
          } else if (elapsed >= T_INTRO && elapsed < T_IRIS_OPEN) {
            // 🌊 바다소리 페이드 인 완료 (0 -> 1)
            const vol = (elapsed - T_INTRO) / (T_IRIS_OPEN - T_INTRO);
            seaAudioRef.current.volume = Math.min(1, Math.max(0, vol));
          } else if (elapsed >= T_IRIS_OPEN && elapsed < T_IRIS_CLOSE_START) {
            seaAudioRef.current.volume = 1;
          } else if (
            elapsed >= T_IRIS_CLOSE_START &&
            elapsed < T_IRIS_CLOSE_END
          ) {
            // 🌊 바다소리 페이드 아웃 완료 (1 -> 0)
            const vol =
              1 -
              (elapsed - T_IRIS_CLOSE_START) /
                (T_IRIS_CLOSE_END - T_IRIS_CLOSE_START);
            seaAudioRef.current.volume = Math.min(1, Math.max(0, vol));
          } else {
            seaAudioRef.current.volume = 0;
          }
        }

        // --- 그래픽 드로잉 파트 ---
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#7dd3fc');
        gradient.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const loopDuration = 3;
        const t = elapsed % loopDuration;
        const waveSpeed = (2 * Math.PI) / loopDuration;
        const bobSpeed = (4 * Math.PI) / loopDuration;

        // 파도 1 (뒤)
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

        // 원숭이 스킨
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

        // 파도 2 (중간)
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

        // 소품 스킨
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

        // 파도 3 (앞쪽 파도 수위 고정 0.72)
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

        // 타자기 텍스트 그래픽 연출
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
          ctx.rect(150, 0, canvas.width - 300, canvas.height); // 좌우 150px 황금 대칭 비율 벽 유지
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

          // ⌨️ 타자기 효과음 타격 엔진 감시탑
          if (
            lettersToShow > lastLettersCountRef.current &&
            typeAudioRef.current
          ) {
            // 중복을 막고 소리를 0초로 강제 되감기한 후 즉시 재생 (탁!)
            const soundClone = typeAudioRef.current.cloneNode();
            soundClone.volume = 0.8;
            soundClone.play().catch(() => {});
            lastLettersCountRef.current = lettersToShow;
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

        // 인트로/아웃트로 UI 텍스트
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
