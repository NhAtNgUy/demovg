import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import styled from "styled-components";
import { auth, db } from "../firebaseConfig";
import { collection, addDoc, getDocs } from "firebase/firestore";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import bd from "../images/bd2.png";
import wed from "../images/wed.webp";

const SearchPage = ({ setSelectedVideo, currentVideo, scoreVideo }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [forYouData, setForYouData] = useState([]);
  const location = useLocation();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const getRandomItems = (array, n) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, n);
  };

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      console.error("Trình duyệt không hỗ trợ nhận diện giọng nói.");
    }
    if (!navigator.onLine) {
      console.error("Vui lòng kết nối internet để sử dụng nhận diện giọng nói.");
    }
  }, [browserSupportsSpeechRecognition]);

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
    }
  }, [transcript]);

  const getQueryParam = (param) => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get(param) || "";
  };

  useEffect(() => {
    const queryFromUrl = getQueryParam("q");
    if (queryFromUrl) {
      setQuery(queryFromUrl);
      handleSearch(queryFromUrl);
    }
  }, [location.search]);

  const fetchForYouData = async () => {
    try {
      const trendingResponse = await axios.get("http://localhost:8000/trending");
      const trendingVideos = (trendingResponse.data || []).map(video => ({
        ...video,
        source: 'trending'
      }));

      let historyVideos = [];
      let favoriteVideos = [];
      let userId = auth.currentUser ? auth.currentUser.uid : null;
      if (userId) {
        const historySnapshot = await getDocs(
          collection(db, "history", userId, "videos")
        );
        historyVideos = historySnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          source: 'history',
          timestamp: doc.data().timestamp || new Date().toISOString()
        }));

        const favoritesSnapshot = await getDocs(
          collection(db, "favorites", userId, "videos")
        );
        favoriteVideos = favoritesSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          source: 'favorites'
        }));
      }

      let recommendedVideos = [];
      if (userId) {
        try {
          const recommendResponse = await axios.get("http://localhost:8000/recommend-for-you", {
            params: { user_id: userId },
          });
          const { history_recommendations, favorites_recommendations } = recommendResponse.data;
          recommendedVideos = [
            ...history_recommendations,
            ...favorites_recommendations
          ].map(video => ({
            ...video,
            source: 'recommendations'
          }));
          recommendedVideos = getRandomItems(recommendedVideos, 10);
        } catch (error) {
          console.error("Error fetching recommendations:", error);
        }
      }

      if (recommendedVideos.length === 0) {
        recommendedVideos = [
          { videoId: "default_video_id_1", title: "Default Video 1", source: 'recommendations', thumbnail: "default_thumbnail.jpg", artist: "Unknown", genre: "Unknown", viewCount: "0" },
          { videoId: "default_video_id_2", title: "Default Video 2", source: 'recommendations', thumbnail: "default_thumbnail.jpg", artist: "Unknown", genre: "Unknown", viewCount: "0" }
        ];
      }

      const allVideos = [...historyVideos, ...favoriteVideos, ...recommendedVideos, ...trendingVideos];
      const uniqueVideos = Object.values(
        allVideos.reduce((acc, video) => {
          if (!acc[video.videoId]) {
            acc[video.videoId] = video;
          } else if (
            (video.source === 'history' && (!acc[video.videoId].source === 'history' || video.timestamp > acc[video.videoId].timestamp)) ||
            (video.source === 'favorites' && acc[video.videoId].source !== 'history') ||
            (video.source === 'recommendations' && ['trending', 'recommendations'].includes(acc[video.videoId].source))
          ) {
            acc[video.videoId] = video;
          }
          return acc;
        }, {})
      );

      const sortedVideos = uniqueVideos.sort((a, b) => {
        if (a.source === 'history' && b.source !== 'history') return -1;
        if (b.source === 'history' && a.source !== 'history') return 1;
        if (a.source === 'history' && b.source === 'history') {
          return new Date(b.timestamp) - new Date(a.timestamp);
        }
        if (['favorites', 'recommendations'].includes(a.source) && !['favorites', 'recommendations'].includes(b.source)) return -1;
        if (['favorites', 'recommendations'].includes(b.source) && !['favorites', 'recommendations'].includes(a.source)) return 1;
        return 0;
      }).slice(0, 15);

      setForYouData(sortedVideos);
    } catch (error) {
      console.error("Error fetching For You data:", error);
      setForYouData([]);
    }
  };

  useEffect(() => {
    fetchForYouData();
  }, []);

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    try {
      const response = await axios.get(`http://localhost:8000/search`, {
        params: { q: searchQuery },
      });
      setResults(response.data.results || []);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setResults([]);
    }
  };

  const handlePlay = async (video) => {
    setSelectedVideo(video.videoId.toString().trim(), video.title, video);
    if (auth.currentUser) {
      try {
        await addDoc(collection(db, "history", auth.currentUser.uid, "videos"), {
          videoId: video.videoId.toString().trim(),
          title: video.title,
          thumbnail: video.thumbnail,
          timestamp: new Date().toISOString(),
          artist: video.artist,
          genre: video.genre,
          viewCount: video.viewCount,
          language: video.language,
          emotion: video.emotion
        });
        setForYouData((prev) => {
          const newVideo = {
            videoId: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            artist: video.artist,
            genre: video.genre,
            viewCount: video.viewCount,
            language: video.language,
            emotion: video.emotion,
            source: 'history',
            timestamp: new Date().toISOString()
          };
          const updatedVideos = [newVideo, ...prev.filter(v => v.videoId !== video.videoId)];
          return updatedVideos.sort((a, b) => {
            if (a.source === 'history' && b.source !== 'history') return -1;
            if (b.source === 'history' && a.source !== 'history') return 1;
            if (a.source === 'history' && b.source === 'history') {
              return new Date(b.timestamp) - new Date(a.timestamp);
            }
            if (['favorites', 'recommendations'].includes(a.source) && !['favorites', 'recommendations'].includes(b.source)) return -1;
            if (['favorites', 'recommendations'].includes(b.source) && !['favorites', 'recommendations'].includes(a.source)) return 1;
            return 0;
          }).slice(0, 15);
        });
      } catch (error) {
        console.error("Error adding to history:", error);
      }
    }
    if (scoreVideo) {
      scoreVideo(video);
    }
  };

  const addToFavorites = async (video) => {
    if (!auth.currentUser) {
      alert("Vui lòng đăng nhập để thêm vào yêu thích!");
      return;
    }
    try {
      await addDoc(collection(db, "favorites", auth.currentUser.uid, "videos"), {
        videoId: video.videoId.toString().trim(),
        title: video.title,
        thumbnail: video.thumbnail,
        artist: video.artist,
        genre: video.genre,
        viewCount: video.viewCount,
        language: video.language,
        emotion: video.emotion
      });
      alert("Đã thêm vào yêu thích!");
      setForYouData((prev) => {
        const newVideo = {
          videoId: video.videoId,
          title: video.title,
          thumbnail: video.thumbnail,
          artist: video.artist,
          genre: video.genre,
          viewCount: video.viewCount,
          language: video.language,
          emotion: video.emotion,
          source: 'favorites'
        };
        const updatedVideos = [newVideo, ...prev.filter(v => v.videoId !== video.videoId)];
        return updatedVideos.sort((a, b) => {
          if (a.source === 'history' && b.source !== 'history') return -1;
          if (b.source === 'history' && a.source !== 'history') return 1;
          if (a.source === 'history' && b.source === 'history') {
            return new Date(b.timestamp) - new Date(a.timestamp);
          }
          if (['favorites', 'recommendations'].includes(a.source) && !['favorites', 'recommendations'].includes(b.source)) return -1;
          if (['favorites', 'recommendations'].includes(b.source) && !['favorites', 'recommendations'].includes(a.source)) return 1;
          return 0;
        }).slice(0, 15);
      });
    } catch (error) {
      console.error("Error adding to favorites:", error);
      alert("Có lỗi xảy ra khi thêm vào yêu thích!");
    }
  };

  const toggleRecording = () => {
    if (!browserSupportsSpeechRecognition) {
      console.error("Trình duyệt không hỗ trợ nhận diện giọng nói.");
      return;
    }
    if (listening) {
      SpeechRecognition.stopListening();
      handleSearch(transcript);
    } else {
      resetTranscript();
      SpeechRecognition.startListening({
        language: "vi-VN",
        continuous: false,
      });
      setTimeout(() => {
        if (listening) {
          SpeechRecognition.stopListening();
          handleSearch(transcript);
        }
      }, 5000);
    }
  };

  return (
    <StyledWrapper>
      <div className="container">
        <div className="search-container">
          <input
            className="input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập tên bài hát"
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <svg
            className="mic__icon"
            onClick={toggleRecording}
            style={{ fill: listening ? "#ff4444" : "white" }}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.47 6 6.93V21h2v-3.07c3.39-.46 6-3.4 6-6.93h-2z" />
          </svg>
          <svg className="search__icon" onClick={() => handleSearch()}>
            <g>
              <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
            </g>
          </svg>
        </div>
      </div>

      <div className="suggestion-tags">
      <img style={{width: "40px", height:"40px", bottom:'33px', left:'18%', position: 'relative'}} src={bd} alt="SVG Icon" />
        <div
          className="suggestion-tag"
          onClick={() => {
            setQuery("nhạc sinh nhật");
            handleSearch("nhạc sinh nhật");
          }}
        >
          <span className="word_effect">Nhạc sinh nhật</span>
        </div>

          <img style={{width: "40px", height:"40px", bottom:'33px', left:'18%', position: 'relative'}} src={wed} alt="SVG Icon" />
        <div
          className="suggestion-tag2"
          onClick={() => {
            setQuery("nhạc đám cưới");
            handleSearch("nhạc đám cưới");
          }}
        >
          <span className="word_effect">Nhạc đám cưới</span>
        </div>
        

      </div>

      <div className="video-container">
        {results.length === 0 ? (
          <ForYouSection>
            <h2 style={{ color: "#fff" }}>Dành Cho Bạn</h2>
            {forYouData.length > 0 ? (
              <div className="video-list">
                {forYouData.map((video) => (
                  <div key={video.videoId} className="cardSong">
                  <div className="cardSong_in">
                    <div className="card-header">
                      <img src={video.thumbnail || "default_thumbnail.jpg"} alt={video.title} className="thumbnail" />
                      <div className="song-info">
                        <div className="text-info">
                          <h4>{video.title || "Unknown"}</h4>
                          <p>Artist: {video.artist || "Unknown"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="card-details">
                      <p>Genre: {video.genre || "Unknown"}</p>
                      <p>Views: {video.viewCount || 0}</p>
                    </div>
                    <div className="actions">
                      <svg className="play-icon" onClick={() => handlePlay(video)} fill="none" height={24} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={24} xmlns="http://www.w3.org/2000/svg">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <svg className="add-icon" onClick={() => addToFavorites(video)} fill="none" height={24} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={24} xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </div>
                  </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Không có gợi ý nào. Hãy thử tìm kiếm hoặc phát một bài hát!</p>
            )}
          </ForYouSection>
        ) : (
          results.map((result) => (
                <div key={result.docId} className="cardSong">
                <div className="cardSong_in">
                  <div className="card-header">
                    <img src={result.thumbnail} alt={result.title} className="thumbnail" />
                    <div className="song-info">
                      <div className="text-info">
                        <h4>{result.title}</h4>
                        <p>Artist: {result.artist || "Unknown"}</p>
                      </div>
                    </div>
                    <div className="actions">
                      <svg className="play-icon" onClick={() => handlePlay(result)} fill="none" height={24} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={24} xmlns="http://www.w3.org/2000/svg">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <svg className="delete-icon" onClick={() => addToFavorites(result)} fill="none" height={24} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={24} xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </div>
                  </div>
                  <div className="card-details">
                    <p>Genre: {result.genre || "Unknown"}</p>
                    <p>Views: {result.viewCount || 0}</p>
                  </div>
                </div>
                </div>
              ))
        )}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .video-container {
    max-height: 600px;
    overflow-y: auto;
    padding: 10px;
    border-radius: 10px;
    background: rgba(7, 24, 46, 0.8);
  }
  .container {
    position: relative;
    background-image: linear-gradient(180deg, rgb(0, 183, 255), rgb(255, 48, 255));
    border-radius: 1000px;
    padding: 10px;
    display: grid;
    place-content: center;
    z-index: 0;
    max-width: 300px;
    margin: 0 10px;
  }
  .search-container {
    position: relative;
    width: 97%;
    border-radius: 50px;
    background: #07182e;
    padding: 5px;
    display: flex;
    align-items: center;
    color: white;
  }

  .search-container::after,
  .search-container::before {
    content: "";
    width: 100%;
    height: 100%;
    border-radius: inherit;
    position: absolute;
  }
  .search-container::before {
    top: -1px;
    left: -1px;
    background: #07182e;
    z-index: -1;
  }
  .search-container::after {
    bottom: -1px;
    right: -1px;
    background: #07182e;
    box-shadow: rgba(79, 156, 232, 0.7019607843) 3px 3px 5px 0px,
      rgba(79, 156, 232, 0.7019607843) 5px 5px 20px 0px;
    z-index: -2;
  }
  .input {
    padding: 10px;
    width: 100%;
    background: #07182e;
    border: none;
    color: rgb(225, 216, 216);
    font-size: 20px;
    border-radius: 50px;
  }
  .input:focus {
    outline: none;
    background: #07182e;
  }
  .input::placeholder {
    color: rgb(225, 216, 216);
    opacity: 1;
  }
  .search__icon,
  .mic__icon {
    width: 50px;
    aspect-ratio: 1;
    border-left: 2px solid white;
    border-top: 3px solid transparent;
    border-bottom: 3px solid transparent;
    border-radius: 50%;
    padding-left: 5px;
    padding-top: 6px;
    margin-right: 10px;
    cursor: pointer;
  }
  .search__icon:hover,
  .mic__icon:hover {
    border-left: 3px solid white;
  }
  .search__icon path,
  .mic__icon path {
    fill: white;
  }
  .suggestion-tags {
    display: flex;
    gap: 10px;
    margin: 10px 0;
    justify-content: center;
  }
  .suggestion-tag {
    padding: 11px 16px;
    background:rgb(80, 222, 254);
    color: white;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.3s ease;
  }
  .suggestion-tag:hover {
    background: #1a2a44;
  }
  .suggestion-tag2 {
    padding: 11px 16px;
    background:rgb(250, 84, 129);
    color: white;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.3s ease;
  }
  .suggestion-tag2:hover {
    background: #1a2a44;
  }
  .word_effect {
    transform: translate(-50%, -50%);
    color: #fff;
    background: linear-gradient(to right,rgba(255, 247, 21, 0.99) 0, #fff 10%, rgb(239, 234, 66) 75%, #fff 10%, rgba(255, 247, 21, 0.99) 0);
    background-position: 0;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shine 5s infinite linear;
    animation-fill-mode: forwards;
    -webkit-text-size-adjust: none;
    font-weight: 600;
    font-size: 16px;
    text-decoration: none;
    white-space: nowrap;
    font-family: "Poppins", sans-serif;
  }
  @keyframes shine {
    0% { background-position: 0; }
    75% { background-position: 180px; }
    100% { background-position: 180px; }
  }

.cardSong {
    width: 80%;
    margin: 20px 8%;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding:5px;
    background-image: linear-gradient(144deg,#AF40FF, #5B42F3 50%,#00DDEB); 
  }
  .cardSong_in { 
    background: rgb(5, 6, 45);
    border-radius: 17px;
    width: 100%;
    height: 100%;
  }
  .card-header {
    display: flex;
    align-items: center;
    padding: 16px;
    width: 95%;
  }

  .thumbnail {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 4px;
    margin-right: 16px;
  }

  .song-info {
    flex-grow: 1;
    display: flex;
    align-items: center;
  }

  .text-info {
    flex-grow: 1;
  }

  .text-info h4 {
    font-size: 18px;
    font-weight: 500;
    color:rgb(231, 231, 231); 
    margin: 0;
    white-space: normal;
    word-wrap: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .text-info p {
    font-size: 14px;
    color:rgb(199, 199, 199); 
    margin: 2px 0 0 0;
  }

  .actions {
    display: flex;
    align-items: center;
  }

  .play-icon {
    height: 24px;
    width: 24px;
    color: #3b82f6; 
    cursor: pointer;
    margin-right: 16px;
  }

  .delete-icon {
    height: 24px;
    width: 24px;
    color: #ef4444;
    cursor: pointer;
  }

  .card-details {
    padding: 16px;
    width: 100%;
  }

  .card-details p {
    font-size: 14px;
    color: rgb(199, 199, 199);
    margin: 4px 0;
  }
`;

const ForYouSection = styled.div`
  width: 97%;
  padding: 10px;

  h2 {
    font-size: 24px;
    margin-bottom: 20px;
    text-align: center;
    color: #fff;
  }

  .video-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }

  .cardSong {
    width: 30%;
    margin: 10px 0;
    background: rgb(5, 6, 45);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding:5px;
    background-image: linear-gradient(144deg,#AF40FF, #5B42F3 50%,#00DDEB);
  }
  .cardSong_in{
    background: rgb(5, 6, 45);
    border-radius: 17px;
    width: 100%;
    height: 100%;
    
  }
  .card-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
    width: 100%;
    box-sizing: border-box;
  }

  .thumbnail {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 4px 4px 0 0;
    margin-bottom: 16px;
  }

  .song-info {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .text-info {
    width: 100%;
  }

  .text-info h4 {
    font-size: 16px;
    font-weight: 500;
    color:rgb(245, 245, 245); 
    margin: 0;
    white-space: normal;
    word-wrap: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .text-info p {
    font-size: 14px;
    color:rgb(199, 199, 199); 
    margin: 2px 0;
  }

  .actions {
    display: flex;
    justify-content: flex-start;
    padding: 16px;
    gap: 16px;
  }

  .play-icon {
    height: 24px;
    width: 24px;
    color: #3b82f6; 
    cursor: pointer;
  }

  .add-icon {
    height: 24px;
    width: 24px;
    color:rgb(255, 111, 111); 
    cursor: pointer;
  }

  .card-details {
    padding: 0 16px 16px 16px;
    width: 100%;
  }

  .card-details p {
    font-size: 14px;
    color: rgb(199, 199, 199); 
    margin: 4px 0;
  }

  
`;

export default SearchPage;