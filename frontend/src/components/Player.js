import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactPlayer from "react-player";
import styled from "styled-components";
import axios from "axios";
import ScoreDisplay from "./ScoreDisplay";

const Player = ({ videoId, videoTitle, onPlay }) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isScoringEnabled, setIsScoringEnabled] = useState(true);

  console.log("Player initialized with videoId:", videoId, "videoTitle:", videoTitle);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mp3" });
        setIsRecording(false);

        if (isScoringEnabled) {
          await handleFinishSinging(audioBlob);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError("Không thể truy cập microphone. Vui lòng cấp quyền và thử lại: " + err.message);
      setIsRecording(false);
    }
  }, [isScoringEnabled]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      console.log("Stopping recording at video end");
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleFinishSinging = useCallback(async (audioBlob) => {
    if (!videoId || !audioBlob) return;
    console.log("Sending video_id to /process-and-score:", videoId);
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("video_id", videoId);
      formData.append("user_audio", audioBlob, "recording.mp3");

      const response = await axios.post("http://localhost:8000/process-and-score", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setScores(response.data);
    } catch (err) {
      setError("Lỗi khi chấm điểm: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    if (playing && !isRecording) {
      startRecording();
    } else if (!playing && isRecording) {
      stopRecording();
    }
  }, [playing, isRecording, startRecording, stopRecording]);

  if (!videoId) return null;

  const handlePlay = () => {
    setPlaying(true);
    if (!isRecording) startRecording();
    console.log("Player onPlay called with videoId:", videoId, "videoTitle:", videoTitle);
    if (onPlay && videoTitle) {
      onPlay(videoId, videoTitle, {}); // Gọi onPlay với videoId và videoTitle
    }
  };

  const handleSeekChange = (e) => {
    const seekTo = parseFloat(e.target.value);
    setPlayed(seekTo);
    playerRef.current.seekTo(seekTo, "fraction");
  };

  const handleRewind = () => {
    const currentTime = playerRef.current.getCurrentTime();
    const newTime = Math.max(currentTime - 10, 0);
    playerRef.current.seekTo(newTime, "seconds");
    setPlayed(newTime / duration);
  };

  const handleForward = () => {
    const currentTime = playerRef.current.getCurrentTime();
    const newTime = Math.min(currentTime + 10, duration);
    playerRef.current.seekTo(newTime, "seconds");
    setPlayed(newTime / duration);
  };

  const handleVolumeUp = () => {
    setVolume((prev) => Math.min(prev + 0.1, 1.0));
  };

  const handleVolumeDown = () => {
    setVolume((prev) => Math.max(prev - 0.1, 0.0));
  };

  const handleProgress = (state) => {
    setPlayed(state.played);
  };

  const handleDuration = (duration) => {
    setDuration(duration);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.mozRequestFullScreen) {
        containerRef.current.mozRequestFullScreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const toggleScoring = () => {
    setIsScoringEnabled((prev) => !prev);
  };

  return (
    <StyledWrapper>
      <div className="Player" ref={containerRef}>
        <ReactPlayer
          ref={playerRef}
          url={`https://www.youtube.com/watch?v=${videoId}`}
          controls={false}
          width="100%"
          playing={playing}
          volume={volume}
          onProgress={handleProgress}
          onDuration={handleDuration}
          onEnded={() => {
            console.log("Video ended, stopping recording");
            stopRecording();
            setPlaying(false);
          }}
          onPlay={handlePlay}
        />
        <div className="controls">
          <div className="seek-bar">
            <span>{formatTime(played * duration)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step="any"
              value={played}
              onChange={handleSeekChange}
              style={{ width: "100%" }}
            />
            <span>{formatTime(duration)}</span>
          </div>

          <div className="radio-inputs">
            <label className="radio">
              <input name="radio" type="radio" />
              <span className="name" onClick={handleRewind}>⏪ Tua lùi</span>
            </label>
            <label className="radio">
              <input name="radio" type="radio" />
              <span className="name" onClick={() => {
                setPlaying(!playing);
              }}>
                {playing ? "Tạm dừng" : "Phát"}
              </span>
            </label>
            <label className="radio">
              <input name="radio" type="radio" />
              <span className="name" onClick={handleForward}>Tua tiếp ⏩</span>
            </label>
            <label className="radio">
              <input name="radio" type="radio" />
              <span className="name" onClick={handleVolumeDown}>🔉 Giảm âm</span>
            </label>
            <label className="radio">
              <input name="radio" type="radio" />
              <span className="name" onClick={handleVolumeUp}>🔊 Tăng âm</span>
            </label>
            <label className="radio">
              <input name="radio" type="radio" />
              <span className="name" onClick={handleFullscreen}>
                {isFullscreen ? "Thu nhỏ" : "Phóng to"} 🖥️
              </span>
            </label>
            <label className="radio">
              <input name="radio" type="radio" />
              <span className="name" onClick={toggleScoring}>
                {isScoringEnabled ? "Tắt chấm điểm" : "Bật chấm điểm"}
              </span>
            </label>
          </div>
        </div>
        {isRecording && <p style={{ color: '#fff', textAlign: 'center' }}>Đang ghi âm...</p>}
        {loading && <p style={{ color: '#fff', textAlign: 'center' }}>Đang chấm điểm...</p>}
        {error && <p style={{ color: '#ff4444', textAlign: 'center' }}>{error}</p>}
      </div>
      <ScoreDisplay scores={scores} onClose={() => setScores(null)} />
    </StyledWrapper>
  );
};

// Giữ nguyên styled-components từ file gốc
const StyledWrapper = styled.div`
  .Player {
    width: 98.13%;
    padding: 10px;
  }

  .Player h2 {
    color: white;
  }

  .controls {
    margin-top: 10px;
  }

  .seek-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    color: white;
  }

  .seek-bar input[type="range"] {
    -webkit-appearance: none;
    height: 5px;
    background: #ddd;
    border-radius: 5px;
  }

  .seek-bar input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 15px;
    height: 15px;
    background: #4CAF50;
    border-radius: 50%;
    cursor: pointer;
  }

  .radio-inputs {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    border-radius: 1rem;
    background: linear-gradient(145deg, #e6e6e6, #ffffff);
    box-sizing: border-box;
    box-shadow:
      5px 5px 15px rgba(0, 0, 0, 0.15),
      -5px -5px 15px rgba(255, 255, 255, 0.8);
    padding: 0.5rem;
    width: 300px;
    font-size: 14px;
    gap: 0.5rem; 
    margin-left:20px
  }

  .radio-inputs .radio {
    flex: 1 1 auto;
    text-align: center;
    position: relative;
  }

  .radio-inputs .radio input {
    display: none;
  }

  .radio-inputs .radio .name {
    display: flex;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    border-radius: 0.7rem;
    border: none;
    padding: 0.7rem 0;
    color: #2d3748;
    font-weight: 500;
    font-family: inherit;
    background: linear-gradient(145deg, #ffffff, #e6e6e6);
    box-shadow:
      3px 3px 6px rgba(0, 0, 0, 0.1),
      -3px -3px 6px rgba(255, 255, 255, 0.7);
    transition: all 0.2s ease;
    overflow: hidden; 
    min-width: 80px; 
    user-select: none;
  }

  .radio-inputs .radio:hover .name {
    background: linear-gradient(145deg, #f0f0f0, #ffffff);
    transform: translateY(-1px);
    box-shadow:
      4px 4px 8px rgba(0, 0, 0, 0.1),
      -4px -4px 8px rgba(255, 255, 255, 0.8);
  }

  .radio-inputs .radio .name:active {
    background: linear-gradient(145deg, #3b82f6, #2563eb);
    color: white;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    box-shadow:
      inset 2px 2px 5px rgba(0, 0, 0, 0.2),
      inset -2px -2px 5px rgba(255, 255, 255, 0.1),
      3px 3px 8px rgba(59, 130, 246, 0.3);
    transform: translateY(2px);
    animation: select 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .radio-inputs .radio .name::before,
  .radio-inputs .radio .name::after {
    content: "";
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
  }

  .radio-inputs .radio .name::before {
    background: #60a5fa;
    box-shadow: 0 0 6px #60a5fa;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
  }

  .radio-inputs .radio .name::after {
    background: #93c5fd;
    box-shadow: 0 0 8px #93c5fd;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
  }

  .radio-inputs .radio .name:active::before {
    box-shadow:
      0 0 6px #60a5fa,
      10px -10px 0 #60a5fa,
      -10px -10px 0 #60a5fa;
    animation: multi-particles-top 0.8s ease-out forwards;
  }

  .radio-inputs .radio .name:active::after {
    box-shadow:
      0 0 8px #93c5fd,
      10px 10px 0 #93c5fd,
      -10px 10px 0 #93c5fd;
    animation: multi-particles-bottom 0.8s ease-out forwards;
  }

  @keyframes select {
    0% {
      transform: scale(0.95) translateY(2px);
    }
    50% {
      transform: scale(1.05) translateY(-1px);
    }
    100% {
      transform: scale(1) translateY(2px);
    }
  }

  @keyframes multi-particles-top {
    0% {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
    40% {
      opacity: 0.8;
    }
    100% {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px) scale(0);
      box-shadow:
        0 0 6px transparent,
        20px -20px 0 transparent,
        -20px -20px 0 transparent;
    }
  }

  @keyframes multi-particles-bottom {
    0% {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
    40% {
      opacity: 0.8;
    }
    100% {
      opacity: 0;
      transform: translateX(-50%) translateY(20px) scale(0);
      box-shadow:
        0 0 8px transparent,
        20px 20px 0 transparent,
        -20px 20px 0 transparent;
    }
  }
`;

export default Player;