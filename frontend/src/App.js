import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SearchPage from "./Pages/SearchPage";
import FavoritesPage from "./Pages/FavoritesPage";
import CategoriesPage from "./Pages/CategoriesPage";
import CategoryDetailPage from "./Pages/CategoryDetailPage";
import HomePage from "./Pages/HomePage";
import CreateKaraokePage from "./Pages/CreateKaraokePage";
import { Helmet } from "react-helmet";
import Player from "./components/Player";
import Button from "./components/Button";
import styled from "styled-components";
import AuthPage from "./Pages/AuthPage";
import RecommendationSection from "./components/RecommendationSection";
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, increment, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CurrentSongCard from "./components/CurrentSongCard";
import logo from "./images/logo2.png";
import noti2 from "./images/noti2.png";

const AppContent = () => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectVideo = async (videoId, videoTitle, videoData = {}) => {
  console.log("handleSelectVideo called with:", { videoId, videoTitle });
  if (!videoId || !videoTitle) {
    console.warn("Missing videoId or videoTitle:", { videoId, videoTitle });
    return;
  }
  setSelectedVideo(null); // Reset trước
  setSelectedVideoTitle(null);
  setTimeout(() => {
    setSelectedVideo(videoId);
    setSelectedVideoTitle(videoTitle);
  }, 0); // Cập nhật trong hàng đợi microtask
  if (user) {
    await updateHistoryAndMostViewed(videoId, videoTitle, videoData);
  }
};

  const updateHistoryAndMostViewed = async (videoId, videoTitle, videoData) => {
    try {
      const historyRef = collection(db, "history", user.uid, "videos");
      const q = query(historyRef, where("videoId", "==", videoId));
      const historySnapshot = await getDocs(q);

      if (!historySnapshot.empty) {
        const existingVideo = historySnapshot.docs[0];
        await updateDoc(doc(db, "history", user.uid, "videos", existingVideo.id), {
          timestamp: new Date().toISOString(),
        });
        console.log("Updated timestamp in history:", videoId);
      } else {
        const fullHistorySnapshot = await getDocs(historyRef);
        const historyCount = fullHistorySnapshot.size;

        if (historyCount >= 50) {
          const oldestVideo = fullHistorySnapshot.docs[fullHistorySnapshot.size - 1];
          await deleteDoc(doc(db, "history", user.uid, "videos", oldestVideo.id));
        }

        await addDoc(historyRef, {
          videoId,
          title: videoTitle,
          thumbnail: videoData.thumbnail || "https://via.placeholder.com/80",
          viewCount: videoData.viewCount || "0",
          artist: videoData.artist || "Unknown",
          genre: videoData.genre || "Unknown",
          language: videoData.language || "Unknown",
          emotion: videoData.emotion || "Unknown",
          timestamp: new Date().toISOString(),
        });
        console.log("Added to history:", videoId);
      }

      const mostViewedRef = doc(db, "most_viewed_videos", videoId);
      const mostViewedDoc = await getDoc(mostViewedRef);

      if (mostViewedDoc.exists()) {
        await updateDoc(mostViewedRef, {
          watchCount: increment(1),
          lastWatched: new Date().toISOString(),
        });
      } else {
        await setDoc(mostViewedRef, {
          videoId,
          title: videoTitle,
          thumbnail: videoData.thumbnail || "https://via.placeholder.com/80",
          viewCount: videoData.viewCount || "0",
          watchCount: 1,
          lastWatched: new Date().toISOString(),
        });
      }
      console.log("Updated most_viewed_videos:", videoId);
    } catch (error) {
      console.error("Error updating history or most viewed videos:", error);
    }
  };

  // Định nghĩa scoreVideo (tạm thời log để kiểm tra)
  const scoreVideo = (video) => {
    if (video && video.videoId) {
      console.log("Scoring video:", video.videoId);
      // Thêm logic chấm điểm thực tế nếu cần (ví dụ: gọi runScoring từ ScoringService.js)
    }
  };

  const currentVideo = selectedVideo ? { videoId: selectedVideo, title: selectedVideoTitle } : null;

  return (
    <>
      <Helmet>
        <title>Vengle Kara - Karaoke Tổng Hợp</title>
        <meta name="google-site-verification" content="keZwuT35I645YU8sx38bT--gghE92NagRbxiRW2_gEQ" />
        <meta name="description" content="Venka là website giúp bạn tìm kiếm và giao lưu karaoke với người thân và bạn bè." />
        <meta name="keywords" content="karaoke, VenKa, nhạc" />
      </Helmet>

      <CurrentSongCard currentVideo={currentVideo} />

      <StyledWrapper>
        <div style={{ display: "flex", height: "200vh" }}>
          <div className="BackMenu" style={{ width: "15%", padding: "10px" }}>
          <img style={{width: "100px", height:"100px", marginLeft:'30%', borderRadius:'15px'}} src={logo} alt="SVG Icon" /> 
            <Button />
          </div>
          <div className="background_mid" style={{ width: "60%", padding: "10px" }}>
            <Routes>
              <Route path="/" element={<HomePage setSelectedVideo={handleSelectVideo} currentVideo={currentVideo} />} />
              <Route
                path="/search"
                element={<SearchPage setSelectedVideo={handleSelectVideo} currentVideo={currentVideo} scoreVideo={scoreVideo} />}
              />
              <Route path="/favorites" element={<FavoritesPage setSelectedVideo={handleSelectVideo} currentVideo={currentVideo} />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route
                path="/categories/:category_name"
                element={<CategoryDetailPage setSelectedVideo={handleSelectVideo} currentVideo={currentVideo} />}
              />
              <Route path="/account" element={<AuthPage setSelectedVideo={handleSelectVideo} currentVideo={currentVideo} />} />
              <Route path="/create-karaoke" element={<CreateKaraokePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "linear-gradient(#9b59b6,rgb(94, 191, 251))",
              padding: "10px",
              width: "25%",
              height: "100%",
              overflowY: "auto",
            }}
          >
            {selectedVideo ? (
              <>
                <Player
                  key={selectedVideo}
                  videoId={selectedVideo.toString().trim()}
                  onPlay={handleSelectVideo}
                />
                <RecommendationSection
                  videoId={selectedVideo.toString().trim()}
                  videoTitle={selectedVideoTitle}
                  setSelectedVideo={handleSelectVideo}
                />
              </>
            ) : (
              <img style={{width: "350px", height:"250px", marginLeft:'4%', marginTop:'60%',borderRadius:'15px'}} src={noti2} alt="SVG Icon" />
            )}
          </div>
        </div>
      </StyledWrapper>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

const StyledWrapper = styled.div`
  height: 100vh;
  overflow: hidden;
  .BackMenu {
    background: linear-gradient(#9b59b6, rgb(94, 191, 251));
    width: 15%;
    padding: 10px;
  }
  .background_mid {
    position: relative;
    width: 60%;
    height: 100%;
    --c: #9b59b6;
    --d: rgb(94, 191, 251);
    background-color: rgb(30, 30, 30);
    background-image:
      radial-gradient(1.5px 1.5px at 150px 126.5px, var(--c) 100%, #0000 150%),
      radial-gradient(4px 100px at 0px 204px, var(--c), #0000),
      radial-gradient(4px 100px at 300px 204px, var(--c), #0000),
      radial-gradient(1.5px 1.5px at 150px 102px, var(--c) 100%, #0000 150%),
      radial-gradient(4px 100px at 0px 134px, var(--c), #0000),
      radial-gradient(4px 100px at 300px 134px, var(--c), #0000),
      radial-gradient(1.5px 1.5px at 150px 67px, var(--c) 100%, #0000 150%),
      radial-gradient(4px 100px at 0px 179px, var(--c), #0000),
      radial-gradient(4px 100px at 300px 179px, var(--c), #0000),
      radial-gradient(1.5px 1.5px at 150px 89.5px, var(--c) 100%, #0000 150%),
      radial-gradient(4px 100px at 0px 281px, var(--d), #0000),
      radial-gradient(4px 100px at 300px 281px, var(--d), #0000),
      radial-gradient(1.5px 1.5px at 150px 140.5px, var(--d) 100%, #0000 150%),
      radial-gradient(4px 100px at 0px 158px, var(--d), #0000),
      radial-gradient(4px 100px at 300px 158px, var(--d), #0000),
      radial-gradient(1.5px 1.5px at 150px 79px, var(--d) 100%, #0000 150%),
      radial-gradient(4px 100px at 0px 210px, var(--d), #0000),
      radial-gradient(4px 100px at 300px 210px, var(--d), #0000),
      radial-gradient(1.5px 1.5px at 150px 105px, var(--d) 100%, #0000 150%);
    background-size:
      300px 215px,
      300px 215px,
      300px 215px,
      300px 281px,
      300px 281px,
      300px 281px,
      300px 158px,
      300px 158px,
      300px 158px,
      300px 210px,
      300px 210px,
      300px 210px;
    will-change: transform;
    animation: hi 150s linear infinite;
  }

  @keyframes hi {
    0% {
      background-position:
        0px 220px,
        3px 220px,
        151.5px 337.5px,
        25px 24px,
        28px 24px,
        176.5px 150px,
        50px 16px,
        53px 16px,
        201.5px 91px,
        75px 224px,
        78px 224px,
        226.5px 350.5px,
        100px 19px,
        103px 19px,
        251.5px 121px,
        125px 120px,
        128px 120px,
        276.5px 187px,
        150px 31px,
        153px 31px,
        301.5px 120.5px,
        175px 235px,
        178px 235px,
        326.5px 384.5px,
        200px 121px,
        203px 121px,
        351.5px 228.5px,
        225px 224px,
        228px 224px,
        376.5px 364.5px,
        250px 26px,
        253px 26px,
        401.5px 105px,
        275px 75px,
        278px 75px,
        426.5px 180px;
    }

    to {
      background-position:
        0px 6800px,
        3px 6800px,
        151.5px 6917.5px,
        25px 13632px,
        28px 13632px,
        176.5px 13758px,
        50px 5416px,
        53px 5416px,
        201.5px 5491px,
        75px 17175px,
        78px 17175px,
        226.5px 17301.5px,
        100px 5119px,
        103px 5119px,
        251.5px 5221px,
        125px 8428px,
        128px 8428px,
        276.5px 8495px,
        150px 9876px,
        153px 9876px,
        301.5px 9965.5px,
        175px 13391px,
        178px 13391px,
        326.5px 13540.5px,
        200px 14741px,
        203px 14741px,
        351.5px 14848.5px,
        225px 18770px,
        228px 18770px,
        376.5px 18910.5px,
        250px 5082px,
        253px 5082px,
        401.5px 5161px,
        275px 6375px,
        278px 6375px,
        426.5px 6480px;
    }
  }
`;

export default App;