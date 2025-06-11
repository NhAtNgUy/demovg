import React, { useState, useEffect } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, onSnapshot, doc, addDoc, deleteDoc, query, where, setDoc } from "firebase/firestore";
import axios from "axios";
import styled from "styled-components";

const FavoritesPage = ({ setSelectedVideo }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const favoritesRef = collection(db, "favorites", user.uid, "videos");
    const q = query(favoritesRef);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const favoritesList = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data(),
      }));

      // Kiểm tra tiêu đề của từng video yêu thích trong SQLite và cập nhật Firestore
      const updatedFavorites = await Promise.all(
        favoritesList.map(async (favorite) => {
          try {
            const response = await axios.get('http://localhost:8000/check-title', {
              params: { title: favorite.title },
            });

            if (response.data.found) {
              // Nếu tìm thấy, cập nhật thông tin chi tiết vào Firestore
              const videoData = response.data.video;
              const videoDocRef = doc(db, "favorites", user.uid, "videos", favorite.docId);
              await setDoc(videoDocRef, {
                videoId: videoData.videoId,
                title: videoData.title,
                thumbnail: videoData.thumbnail,
                viewCount: videoData.viewCount || 0,
                artist: videoData.artist || "Unknown",
                genre: videoData.genre || "Unknown",
                language: videoData.language || "Unknown",
                emotion: videoData.emotions || "Unknown", // Sử dụng "emotions" từ SQLite
              }, { merge: true });
              return { ...favorite, ...videoData, emotion: videoData.emotions };
            }
            return favorite;
          } catch (error) {
            console.error(`Error checking title for video ${favorite.title}:`, error);
            return favorite;
          }
        })
      );

      // In thông tin genre và artist vào console để kiểm tra
      updatedFavorites.forEach(favorite => {
        console.log(`Video: ${favorite.title}, Artist: ${favorite.artist}, Genre: ${favorite.genre}`);
      });

      setFavorites(updatedFavorites);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching favorites:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addToFavorites = async (video) => {
    if (!auth.currentUser) {
      alert("Vui lòng đăng nhập để thêm vào yêu thích!");
      return;
    }

    try {
      await addDoc(collection(db, "favorites", auth.currentUser.uid, "videos"), {
        videoId: video.videoId,
        title: video.title,
        thumbnail: video.thumbnail,
        viewCount: video.viewCount || 0,
        artist: video.artist || "Unknown",
        genre: video.genre || "Unknown",
        language: video.language || "Unknown",
        emotion: video.emotion || "Unknown",
      });
      console.log("Added to favorites:", video);
    } catch (error) {
      console.error("Error adding to favorites:", error);
      alert("Có lỗi xảy ra khi thêm vào yêu thích!");
    }
  };

  const removeFromFavorites = async (docId) => {
    if (!auth.currentUser) {
      alert("Vui lòng đăng nhập để xóa khỏi yêu thích!");
      return;
    }

    try {
      const videoDocRef = doc(db, "favorites", auth.currentUser.uid, "videos", docId);
      await deleteDoc(videoDocRef);
      console.log("Removed from favorites:", docId);
    } catch (error) {
      console.error("Error removing from favorites:", error);
      alert("Có lỗi xảy ra khi xóa khỏi yêu thích!");
    }
  };

  return (
    <div
        style={{
          width: "100%",
          padding: "9px",
          maxHeight: "calc(100vh - 20px)",
          overflowY: "auto",
        }}
      >
    <StyledWrapper>
    <h2 style={{color:"#ffff"}}>Yêu thích</h2>
      <div className="favorites-container">
        
        {loading ? (
          <p>Đang tải danh sách yêu thích...</p>
        ) : auth.currentUser ? (
          <div>
            {favorites.length > 0 ? (
              favorites.map((favorite) => (
                <div key={favorite.docId} className="cardSong">
                <div className="cardSong_in">
                  <div className="card-header">
                    <img src={favorite.thumbnail} alt={favorite.title} className="thumbnail" />
                    <div className="song-info">
                      <div className="text-info">
                        <h4>{favorite.title}</h4>
                        <p>Artist: {favorite.artist || "Unknown"}</p>
                      </div>
                    </div>
                    <div className="actions">
                      <svg className="play-icon" onClick={() => setSelectedVideo(favorite.videoId, favorite.title, favorite)} fill="none" height={24} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={24} xmlns="http://www.w3.org/2000/svg">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <svg className="delete-icon" onClick={() => removeFromFavorites(favorite.docId)} fill="none" height={24} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={24} xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </div>
                  </div>
                  <div className="card-details">
                    <p>Genre: {favorite.genre || "Unknown"}</p>
                    <p>Views: {favorite.viewCount || 0}</p>
                  </div>
                </div>
                </div>
              ))
            ) : (
              <p>Bạn chưa có bài hát yêu thích nào.</p>
            )}
          </div>
        ) : (
          <p>Vui lòng đăng nhập để xem danh sách yêu thích.</p>
        )}
      </div>
    
    </StyledWrapper>
    </div>
  );
};

const StyledWrapper = styled.div`
  .favorites-container {
    width: 80%;
    padding: 10px;
    max-height: calc(100vh - 20px);
    overflow-y: auto;
    margin-left: 18%;
  }

  h2 {
    font-size: 24px;
    margin-bottom: 20px;
    text-align: center;
    color: #333;
  }

  .cardSong {
    width: 80%;
    margin: 10px 0;
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

export default FavoritesPage;