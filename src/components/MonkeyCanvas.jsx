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

    const initAudioContext = () => {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        audioDestRef.current =
          audioCtxRef.current.createMediaStreamDestination();
      }
    };

    useEffect(() => {
      if (!seaAudioSrc) return;
      initAudioContext();

      const audio = new Audio(seaAudioSrc);
      audio.loop = true;
      seaAudioRef.current = audio;

      const source = audioCtxRef.current.createMediaElementSource(audio);
      source.connect(audioCtxRef.current.destination);
      source.connect(audioDestRef.current);

      return () => {
        audio.pause();
      };
    }, [seaAudioSrc]);

    useEffect(() => {
      if (!typeAudioSrc) return;
      initAudioContext();

      const audio = new Audio(typeAudioSrc);
      typeAudioRef.current = audio;

      const source = audioCtxRef.current.createMediaElementSource(audio);
      source.connect(audioCtxRef.current.destination);
      source.connect(audioDestRef.current);

      return () => {
        audio.pause();
      };
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

        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }

        if (seaAudioRef.current) {
          seaAudioRef.current.currentTime = 0;
          seaAudioRef.current.volume = 0;
          seaAudioRef.current
            .play()
            .catch((e) => console.warn('오디오 차단 해제 중...', e));
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

        if (seaAudioRef.current) {
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

        // 파도 1
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

        // 원숭이 캐릭터
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

        // 파도 2
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

        // 소품
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

        // 파도 3
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

        // 타자기 UI
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
          ctx.rect(150, 0, canvas.width - 300, canvas.height);
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

          // 🎵 오디오 선행 타격 엔진 (0.17초 미리 시작)
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

          if (
            audioLettersToPlay > lastLettersCountRef.current &&
            typeAudioRef.current
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
