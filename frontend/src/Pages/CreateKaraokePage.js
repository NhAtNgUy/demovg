import React, { useState, useEffect, useRef } from 'react';
import '../index.css';
import { v4 as uuidv4 } from 'uuid';
import styled from "styled-components";

const CreateKaraokePage = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [title, setTitle] = useState('');
  const [segments, setSegments] = useState([]);
  const [audioData, setAudioData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [karaokeList, setKaraokeList] = useState([]);
  const audioRef = useRef(null);
  const lyricsLines = lyrics.split('\n').filter(line => line.trim());

  // Load danh sách karaoke từ localStorage
  useEffect(() => {
    const savedKaraoke = localStorage.getItem('karaokeList');
    if (savedKaraoke) {
      setKaraokeList(JSON.parse(savedKaraoke));
    }
  }, []);

  // Lưu danh sách karaoke vào localStorage
  useEffect(() => {
    if (karaokeList.length > 0) {
      localStorage.setItem('karaokeList', JSON.stringify(karaokeList));
    } else {
      localStorage.removeItem('karaokeList');
    }
  }, [karaokeList]);

  // Xử lý chọn file audio
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setFileName(file.name);
      setError(null);
    } else {
      setAudioFile(null);
      setFileName('');
      setError('Vui lòng chọn file audio hợp lệ');
    }
  };

  // Xử lý thay đổi lyrics
  const handleLyricsChange = (e) => {
    setLyrics(e.target.value);
    setError(null);
  };

  // Xử lý thay đổi tiêu đề
  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setError(null);
  };

  // Gửi yêu cầu phân tích
  const handleAnalyze = async () => {
    if (!audioFile || !lyrics.trim() || !title.trim()) {
      setError('Vui lòng cung cấp tiêu đề, file audio và lời bài hát');
      return;
    }
    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('lyrics', lyrics.trim());

      const response = await fetch('http://localhost:8000/analyze_audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Phân tích thất bại');

      const data = await response.json();
      if (!data.segments || !data.audio_data) {
        throw new Error('Không nhận được segments hoặc audio_data từ server');
      }

      setSegments(data.segments);
      setAudioData(data.audio_data);
      setIsAnalyzing(false);
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi trong quá trình phân tích');
      setIsAnalyzing(false);
    }
  };

  // Lưu bài karaoke
  const handleSave = () => {
    if (!title.trim() || !audioData || !lyrics.trim() || !segments.length) {
      setError('Không thể lưu: Thiếu thông tin bài hát');
      return;
    }
    const newKaraoke = {
      id: uuidv4(),
      title: title.trim(),
      audioData,
      lyrics: lyrics.trim(),
      segments,
    };
    setKaraokeList([...karaokeList, newKaraoke]);
    handleReset();
  };

  // Xem bài karaoke
  const handleView = (karaoke) => {
    setTitle(karaoke.title);
    setAudioData(karaoke.audioData);
    setLyrics(karaoke.lyrics);
    setSegments(karaoke.segments);
    setFileName('');
    setAudioFile(null);
    setError(null);
  };

  // Xóa bài karaoke
  const handleDelete = (id) => {
    setKaraokeList(karaokeList.filter((k) => k.id !== id));
    if (audioData && title === karaokeList.find((k) => k.id === id)?.title) {
      handleReset();
    }
  };

  // Xử lý sự kiện audio
  useEffect(() => {
    if (!audioRef.current || !audioData) return;

    const audio = audioRef.current;
    audio.src = audioData;

    const handleError = () => {
      setError('Không thể tải file audio. Vui lòng kiểm tra định dạng file.');
      console.error('Audio error:', audio.error);
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
    };
  }, [audioData]);

  // Đồng bộ lyrics với thời gian audio
  useEffect(() => {
    if (!segments.length || !segments.every(seg => seg.start >= 0 && seg.end >= 0)) {
      setCurrentLineIndex(-1);
      return;
    }

    let newIndex = -1;

    if (currentTime >= segments[0].start && currentTime <= segments[0].end) {
      newIndex = 0;
    } else {
      for (let i = 1; i < segments.length; i++) {
        const prevEnd = segments[i - 1].end;
        const currentEnd = segments[i].end;
        if (currentTime >= prevEnd && currentTime <= currentEnd) {
          newIndex = i;
          break;
        }
      }
    }

    if (newIndex !== currentLineIndex) {
      setCurrentLineIndex(newIndex);
    }
  }, [currentTime, segments, currentLineIndex]);

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play().catch((e) => {
        setError('Phát thất bại. Vui lòng tương tác với trang (như click) trước khi phát.');
        console.error('Play error:', e);
      });
    }
  };

  const handleSeek = (time) => {
    if (audioRef.current && time >= 0) {
      audioRef.current.currentTime = time;
    }
  };

  const handleReset = () => {
    setAudioFile(null);
    setFileName('');
    setLyrics('');
    setTitle('');
    setSegments([]);
    setAudioData(null);
    setError(null);
    setCurrentTime(0);
    setCurrentLineIndex(-1);
  };

  return (
    <div
        style={{
          width: "100%",
          padding: "10px",
          maxHeight: "calc(100vh - 20px)",
          overflowY: "auto",
        }}
      >
    <HistoryContainer>
    <div className="app-container">
      <h1 style={{color:'white'}}>Tạo Karaoke</h1>

      {/* Danh sách bài karaoke đã tạo */}
      <StyledWrapper>
      <div
          style={{
            width: "90%",
            marginBottom: "20px",
            padding: "5px",
          }} className="cardSong"
        >
        <div className="cardSong_in">
      <div className="karaoke-list">
        <h2 style={{color:'white', marginLeft:'10px'}}>Danh sách bài hát đã tạo</h2>
        {karaokeList.length === 0 ? (
          <p className="no-karaoke" style={{color:'white'}}>Hãy tạo video karaoke của riêng bạn!</p>
        ) : (
          <div className="karaoke-items">
            {karaokeList.map((karaoke) => (
              <div key={karaoke.id} className="karaoke-item" style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                <span style={{ flex: 1, color:'white', marginLeft:'40px' }}>{karaoke.title}</span>
                <button
                  onClick={() => handleView(karaoke)}
                  className="view-button"
                  style={{
                    padding: '5px 10px',
                    background: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    marginRight: '5px',
                    cursor: 'pointer',
                  }}
                >
                  Xem
                </button>
                <button
                  onClick={() => handleDelete(karaoke.id)}
                  className="delete-button"
                  style={{
                    padding: '5px 10px',
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginRight: '15px',
                  }}
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
    </StyledWrapper>

      {/* Form tạo karaoke */}
      <div className="create-section">
        <h2 style={{color:'white'}}>Tạo bài hát Karaoke mới</h2>
        {!segments.length ? (
          <div className="input-section">
            <div className="title-container">
              <h3 style={{color:'white'}}>Tiêu đề bài hát</h3>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Nhập tiêu đề bài hát..."
                className="title-input"
                style={{ width: '97%', padding: '10px', margin: '10px 0', border: '1px solid #ccc', borderRadius: '5px' }}
              />
            </div>
            <div className="uploader-container">
              <h3 style={{color:'white'}}>Tải File Audio</h3>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="file-input"
                style={{ margin: '10px 0' }}
              />
              {fileName && <p className="file-name">Đã chọn: {fileName}</p>}
            </div>
            <div className="lyrics-container">
              <h3 style={{color:'white'}}>Nhập Lời Bài Hát</h3>
              <textarea
                value={lyrics}
                onChange={handleLyricsChange}
                placeholder="Nhập lời bài hát theo dòng..."
                className="lyrics-textarea"
                rows={10}
                style={{ width: '100%', padding: '10px', margin: '10px 0' }}
              />
            </div>
            <button
              className="analyze-button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              style={{
                padding: '10px 20px',
                background: isAnalyzing ? '#ccc' : '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
              }}
            >
              {isAnalyzing ? 'Đang phân tích...' : 'Tạo Karaoke'}
            </button>
            {isAnalyzing && <div className="loading">Đang xử lý audio...</div>}
            {error && <div className="error-message">{error}</div>}
          </div>
        ) : (
          <div className="karaoke-container">
            <button
              onClick={handleSave}
              className="save-button"
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                marginBottom: '10px',
              }}
            >
              Lưu bài hát
            </button>
            <button
              onClick={handleReset}
              className="reset-button"
              style={{
                padding: '8px 16px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                marginBottom: '10px',
                marginLeft: '10px',
              }}
            >
              Quay lại
            </button>
            <div className="audio-player-container">
              <audio ref={audioRef} controls style={{ width: '100%', margin: '10px 0' }} />
              <button
                onClick={handlePlay}
                className="play-button"
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                }}
              >
                Phát
              </button>
              {error && <div className="error-message">{error}</div>}
            </div>
            <div className="lyrics-display">
              {lyricsLines.map((line, index) => (
                <div
                  key={index}
                  className={`lyrics-line ${index === currentLineIndex ? 'highlight' : ''}`}
                  onClick={() => handleSeek(segments[index]?.start || 0)}
                  style={{
                    padding: '5px',
                    cursor: 'pointer',
                    color: index === currentLineIndex ? '#007bff' : '#ffff',
                    fontWeight: index === currentLineIndex ? 'bold' : 'normal',
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    
    </HistoryContainer>
    </div>
  );
};

const HistoryContainer = styled.div`
  margin-top: 20px;
  padding: 20px;
  background: rgba(7, 24, 46, 0.8);
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  max-height: 1000px;
  overflow-y: auto;
`;

const StyledWrapper = styled.div`
  .cardSong{
    padding:5px;
    background-image: linear-gradient(144deg,#AF40FF, #5B42F3 50%,#00DDEB);
    border-radius: 20px;
  }
  .cardSong_in{
    background: rgb(5, 6, 45);
    border-radius: 17px;
    width: 100%;
    height: 100%;
    padding:3px 1px; 
  }
`;

export default CreateKaraokePage;