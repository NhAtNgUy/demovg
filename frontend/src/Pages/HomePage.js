import React, { useState, useEffect } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import styled from "styled-components";
import axios from "axios";
import king from "../images/crowni.png";
import third from "../images/third.png";
import skien from "../images/30415.png";
import second from "../images/second.png";
import newfun from "../images/newfun.png";
import noti from "../images/noti.png";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";

  // Slider settings
  const settings = {
    dots: true, // Show navigation dots
    infinite: true, // Loop the slider
    speed: 500, // Transition speed
    slidesToShow: 1, // Show one image at a time
    slidesToScroll: 1, // Scroll one image at a time
    autoplay: true, // Auto-play the slider
    autoplaySpeed: 2500, // Time between slides (in ms)
    arrows: true, // Show next/prev arrows
    centerMode: true, // Center the active slide
    centerPadding: "0px", // No padding for centered slide
  };

  // Array of images for the slider
  const images = [skien, newfun, noti];

// Component Card cho 3 video đầu
const Card = ({ video, onClick }) => {
  return (
    <CardStyledWrapper>
      <div className="card work" onClick={onClick}>
        <div className="img-section">
            <img style={{width: "50px", height:"50px", transform: 'none', animation: 'none'}} src={king} alt="SVG Icon" />
        </div>
        <div className="card-desc">
          <div className="card-content">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="thumbnail"
            />
            <div className="text-content">
              <div className="card-header">
                <div className="card-title">{video.title}</div>
                <div className="card-menu">
                </div>
              </div>
              <div className="card-time"><p> Views: {video.viewCount} </p></div>
            </div>
          </div>
        </div>
      </div>
    </CardStyledWrapper>
  );
};
const Card2 = ({ video, onClick }) => {
  return (
    <CardStyledWrapper>
      <div className="card work" onClick={onClick}>
        <div className="img-section2">
            <img style={{width: "80px", height:"60px", transform: 'none', animation: 'none'}} src={second} alt="SVG Icon" />
        </div>
        <div className="card-desc">
          <div className="card-content">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="thumbnail"
            />
            <div className="text-content">
              <div className="card-header">
                <div className="card-title">{video.title}</div>
                <div className="card-menu">
                </div>
              </div>
              <div className="card-time"><p> Views: {video.viewCount} </p></div>
            </div>
          </div>
        </div>
      </div>
    </CardStyledWrapper>
  );
};
const Card3 = ({ video, onClick }) => {
  return (
    <CardStyledWrapper>
      <div className="card work" onClick={onClick}>
        <div className="img-section3">
            <img style={{width: "80px", height:"60px", transform: 'none', animation: 'none'}} src={third} alt="SVG Icon" />
        </div>
        <div className="card-desc">
          <div className="card-content">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="thumbnail"
            />
            <div className="text-content">
              <div className="card-header">
                <div className="card-title">{video.title}</div>
                <div className="card-menu">
                </div>
              </div>
              <div className="card-time"><p> Views: {video.viewCount} </p></div>
            </div>
          </div>
        </div>
      </div>
    </CardStyledWrapper>
  );
};

// CSS cho Card
const CardStyledWrapper = styled.div`
  .card {
    --primary-clr: #1C204B;
    --play: hsl(195, 74%, 62%);
    width: 350px; 
    height: 170px;
    border-radius: 10px;
    margin-bottom: 20px; 
  }

  .card {
    font-family: "Arial";
    color: #fff;
    display: grid;
    cursor: pointer;
    grid-template-rows: 50px 1fr;
  }

  .card-desc {
    border-radius: 10px;
    padding: 10px;
    position: relative;
    top: -10px;
    display: grid;
    gap: 5px;
    background: var(--primary-clr);
  }

  .card-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .thumbnail {
    width: 80px; 
    height: 80px;
    object-fit: cover;
    border-radius: 5px;
  }

  .text-content {
    flex: 1;
    display: grid;
    gap: 5px;
  }

  .card-time {
    font-size: 1.2em;
    font-weight: 500;
    color: #fff;
  }

  .img-section {
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  background: linear-gradient(
    120deg,
    transparent,
    rgba(255, 204, 0, 0.68),
    transparent
  );
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 5px;
}
.img-section2 {
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  background: linear-gradient(
    120deg,
    transparent,
    rgba(180, 180, 180, 0.92),
    transparent
  );
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 5px;
}
.img-section3 {
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  background: linear-gradient(
    120deg,
    transparent,
    rgba(210, 125, 20, 0.92),
    transparent
  );
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 5px;
}
  .card-header {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .card-title {
    flex: 1;
    font-size: 0.9em;
    font-weight: 500;
    white-space: normal; 
    word-wrap: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2; 
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-top: 20px;
  }

  .card-menu {
    display: flex;
    gap: 4px;
    margin-inline: auto;
  }

  .card svg {
    float: right;
    max-width: 100%;
    max-height: 100%;
  }

  .card p { 
    color: #ffff;
  }
`;

const HomePage = ({ setSelectedVideo }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [mostViewedVideos, setMostViewedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostViewedLoading, setMostViewedLoading] = useState(true);

  useEffect(() => {
    // Lấy danh sách video trending từ YouTube Data API
    fetchTrendingVideos();
    // Lấy danh sách video xem nhiều nhất từ Firebase
    fetchMostViewedVideos();
  }, []);

  // Hàm lấy danh sách video trending từ YouTube Data API
  const fetchTrendingVideos = async () => {
    try {
      const YOUTUBE_API_KEY = "AIzaSyBr-OZMcXcKGEkEnVbx5Qn2YBfSqkRcxiQ"; // Sử dụng API key từ backend của bạn
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=VN&maxResults=10&videoCategoryId=10&key=${YOUTUBE_API_KEY}`
      );

      const trendingVideos = response.data.items.map((item) => ({
        videoId: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.default.url,
        viewCount: item.statistics.viewCount || "N/A"
      }));

      console.log("Fetched trending videos:", trendingVideos);
      setRecommendations(trendingVideos);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching trending videos:", error);
      setRecommendations([]); // Fallback nếu API lỗi
      setLoading(false);
    }
  };

  // Hàm lấy danh sách video xem nhiều nhất từ Firebase
  const fetchMostViewedVideos = async () => {
    try {
      setMostViewedLoading(true);
      const historyRef = collection(db, "history");
      const userSnapshot = await getDocs(historyRef);

      console.log("Total users in history:", userSnapshot.size);

      if (userSnapshot.empty) {
        console.log("No users found in history collection.");
        setMostViewedVideos([]);
        setMostViewedLoading(false);
        return;
      }

      let allVideos = [];

      // Lấy tất cả video từ subcollection "videos" của từng user
      const userPromises = userSnapshot.docs.map(async (userDoc) => {
        const userVideosRef = collection(db, "history", userDoc.id, "videos");
        const videosSnapshot = await getDocs(userVideosRef);
        console.log(`Videos for user ${userDoc.id}:`, videosSnapshot.size);
        return videosSnapshot.docs.map((doc) => doc.data());
      });

      // Chờ tất cả dữ liệu từ các user được lấy
      const userVideos = await Promise.all(userPromises);
      allVideos = userVideos.flat();

      console.log("All videos from history:", allVideos);

      if (allVideos.length === 0) {
        console.log("No videos found in history.");
        setMostViewedVideos([]);
        setMostViewedLoading(false);
        return;
      }

      // Gom nhóm video theo videoId và đếm số lần xem
      const videoCountMap = allVideos.reduce((acc, video) => {
        acc[video.videoId] = acc[video.videoId] || {
          videoId: video.videoId,
          title: video.title,
          thumbnail: video.thumbnail,
          viewCount: video.viewCount || "0",
          count: 0,
        };
        acc[video.videoId].count += 1;
        return acc;
      }, {});

      // Chuyển thành mảng và sắp xếp theo số lần xem giảm dần
      const mostViewed = Object.values(videoCountMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Giới hạn top 10 video

      console.log("Fetched most viewed videos:", mostViewed);
      setMostViewedVideos(mostViewed);
      setMostViewedLoading(false);
    } catch (error) {
      console.error("Error fetching most viewed videos:", error);
      setMostViewedVideos([]);
      setMostViewedLoading(false);
    }
  };

  return (
    <StyledWrapper>
      <div
        style={{
          width: "100%",
          padding: "10px",
          maxHeight: "calc(100vh - 20px)",
          overflowY: "auto",
        }}
      >
        <h1 style={{ color: "#ffff" }}>Trang Chủ - VenKa Karaoke</h1>

        {/* Vùng Thông Báo */}
        <center><div
          style={{
            width: "90%",
            marginBottom: "20px",
            padding: "5px",
            borderRadius: "8px",
          }} className="cardSong"
        >
          <div className="cardSong_in"><center><Slider {...settings}>
          {images.map((image, index) => (
            <div key={index}>
              <img
                style={{ width: "600px", height: "300px", margin: "0 auto" }}
                src={image}
                alt={`Slide ${index + 1}`}
              />
            </div>
          ))}
        </Slider></center></div>
        </div></center>

        {/* Vùng Đề Xuất và Xem Nhiều Nhất */}
        <div style={{ display: "flex", gap: "20px" }}>
          {/* Ô Đang Hot */}
          <div style={{ flex: 1 }}>
            <h2 style={{ color: "#ffff" }}>Đang Hot</h2>
            {loading ? (
              <p>Đang tải đề xuất...</p>
            ) : recommendations.length > 0 ? (
              <div className="video-container">
                {recommendations.map((video, index) =>
                  index < 1 ? (
                    <Card
                      key={video.videoId}
                      video={video}
                      onClick={() => setSelectedVideo(video.videoId, video.title, video)}
                    />
                  ) : index < 2 ? (
                    <Card2
                      key={video.videoId}
                      video={video}
                      onClick={() => setSelectedVideo(video.videoId, video.title, video)}
                    />
                  ) : index < 3 ? (
                    <Card3
                      key={video.videoId}
                      video={video}
                      onClick={() => setSelectedVideo(video.videoId, video.title, video)}
                    />
                  ) : (
                    <div
                      key={video.videoId}
                      className="video-card"
                      onClick={() => setSelectedVideo(video.videoId, video.title, video)}
                    >
                      <div className="card-content">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="thumbnail"
                        />
                        <div className="text-content">
                          <div className="card-header">
                            <div className="card-title">{video.title}</div>
                          </div>
                          <div className="card-time1">
                            Views: {video.viewCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p>Không có đề xuất nào tại thời điểm này.</p>
            )}
          </div>

          {/* Ô Xem Nhiều Nhất */}
          <div style={{ flex: 1 }}>
            <h2 style={{ color: "#ffff" }}>Xem Nhiều Nhất</h2>
            {mostViewedLoading ? (
              <p>Đang tải danh sách...</p>
            ) : mostViewedVideos.length > 0 ? (
              <div className="video-container">
                {mostViewedVideos.map((video) => (
                  <div
                    key={video.videoId}
                    className="video-card"
                    onClick={() => setSelectedVideo(video.videoId, video.title, video)}
                  >
                    <div className="card-content">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="thumbnail"
                      />
                      <div className="text-content">
                        <div className="card-header">
                          <div className="card-title">{video.title}</div>
                        </div>
                        <div className="card-time1">
                          Lượt xem: {video.count}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Chưa có lịch sử xem video.</p>
            )}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

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
  }
  .video-container {
    display: block;
    width: 370px; 
    max-height: 500px; 
    overflow-y: auto; 
    padding: 10px;
    border-radius: 10px;
    background: rgb(7, 24, 46);
  }

  .video-card {
    width: 330px; 
    height: 100px; 
    margin-bottom: 10px; 
    cursor: pointer;
    background: #f0f0f0;
    border-radius: 10px;
    padding: 10px;
    display: flex;
    align-items: center;
  }

  .card-content {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .thumbnail {
    width: 80px; 
    height: 80px;
    object-fit: cover;
    border-radius: 5px;
  }

  .text-content {
    flex: 1;
    display: grid;
    gap: 5px;
  }

  .card-header {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .card-title {
    flex: 1;
    font-size: 0.9em; 
    font-weight: 500;
    white-space: normal;
    word-wrap: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-time {
    font-size: 1.2em; 
    font-weight: 500;
    color: #333;
  }
`;

export default HomePage;
