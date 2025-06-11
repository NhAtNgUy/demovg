import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { auth, db } from "../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

const CategoryDetailPage = ({ setSelectedVideo }) => {
  const { category_name } = useParams(); // Lấy thể loại từ URL
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/category/${category_name}`);
        setVideos(response.data.results);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching videos:", error);
        setLoading(false);
      }
    };
    fetchVideos();
  }, [category_name]);

  // Thêm video vào danh sách yêu thích
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
      });
      console.log("Added to favorites:", video);
      alert("Đã thêm vào yêu thích!");
    } catch (error) {
      console.error("Error adding to favorites:", error);
      alert("Có lỗi xảy ra khi thêm vào yêu thích!");
    }
  };

  return (
    <StyledWrapper>
      <div style={{ width: "100%", padding: "10px" }}>
        <h2>{category_name}</h2>
        {loading ? (
          <p>Đang tải danh sách video...</p>
        ) : (
          <div className="video-container">
            {videos.map((video) => (
              <div
                key={video.videoId}
                style={{ margin: "10px", cursor: "pointer", background: "#f0f0f0", position: "relative" }}
              >
                <img src={video.thumbnail} alt={video.title} />
                <h4>{video.title}</h4>
                <p>Views: {video.viewCount}</p>
                <div>Video ID: {video.videoId.toString().trim()}</div>
                <button
                  onClick={() => setSelectedVideo(video.videoId.toString().trim(), video.title, video)}
                  style={{ marginRight: "10px", padding: "5px 10px" }}
                >
                  Phát
                </button>
                <button
                  onClick={() => addToFavorites(video)}
                  style={{ padding: "5px 10px", backgroundColor: "#4CAF50", color: "#fff" }}
                >
                  Thêm yêu thích
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
.video-container {
  max-height: 577px; /* Đặt chiều cao tối đa */
  overflow-y: auto; /* Hiển thị thanh cuộn dọc nếu nội dung vượt quá */
  padding: 10px;
  border-radius: 10px;
  background: #f9f9f9;
}
`;

export default CategoryDetailPage;