import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";

const RecommendationSection = ({ videoId, setSelectedVideo, videoTitle }) => {
  const [recommendationData, setRecommendationData] = useState({});

  useEffect(() => {
    if (videoId) {
      const fetchRecommendations = async () => {
        try {
          const response = await axios.get(`http://localhost:8000/recommend?video_id=${videoId}`);
          const data = response.data;
          setRecommendationData(data);
        } catch (error) {
          console.error("Error fetching recommendations:", error);
          if (error.response) {
            console.log("Error details:", error.response.data);
          }
          setRecommendationData({});
        }
      };
      fetchRecommendations();
    }
  }, [videoId]);

  const renderVideoList = (videos, title) => (
    <div>
      <h4 style={{ color: "#fff", margin: "10px 0" }}>{title}</h4>
      {videos && videos.length > 0 ? (
        <ul>
          {videos.map((video) => (
            <li
              key={video.videoId}
              onClick={() => setSelectedVideo(video.videoId)}
              style={{ cursor: "pointer" }}
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                style={{ width: "50px", height: "auto", marginRight: "10px" }}
              />
              <div style={{ color: "#fff" }}>
                <span>{video.title}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#fff" }}>Không có gợi ý nào.</p>
      )}
    </div>
  );

  const renderRecommendations = () => {
    const { by_genres, same_artist, same_genre_different_artist, same_emotions, same_language, top_viewed_by_genre  } = recommendationData;

    return (
      <>
        {same_artist && same_artist.length > 0 && renderVideoList(same_artist)}
        {same_genre_different_artist && same_genre_different_artist.length > 0 && renderVideoList(same_genre_different_artist)}
        {same_emotions && same_emotions.length > 0 && renderVideoList(same_emotions)}
        {same_language && same_language.length > 0 && renderVideoList(same_language)}

        {by_genres && Object.keys(by_genres).length > 0 && (
          <div>
            {Object.keys(by_genres).map((genre) => (
              by_genres[genre].length > 0 && (
                <div key={genre}>
                  <ul>
                    {by_genres[genre].map((video) => (
                      <li
                        key={video.videoId}
                        onClick={() => setSelectedVideo(video.videoId)}
                        style={{ cursor: "pointer" }}
                      >
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          style={{ width: "50px", height: "auto", marginRight: "10px" }}
                        />
                        <div style={{ color: "#fff" }}>
                          <span>{video.title}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        )}
        {top_viewed_by_genre && Object.keys(top_viewed_by_genre).length > 0 && (
          <div>
            {Object.keys(top_viewed_by_genre).map((genre) => (
              top_viewed_by_genre[genre].length > 0 && (
                <div key={genre}>
                  <ul>
                    {top_viewed_by_genre[genre].map((video) => (
                      <li
                        key={video.videoId}
                        onClick={() => setSelectedVideo(video.videoId)}
                        style={{ cursor: "pointer" }}
                      >
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          style={{ width: "50px", height: "auto", marginRight: "10px" }}
                        />
                        <div style={{ color: "#fff" }}>
                          <span>{video.title}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        )}

        {(!same_artist || same_artist.length === 0) &&
         (!same_genre_different_artist || same_genre_different_artist.length === 0) &&
         (!same_emotions || same_emotions.length === 0) &&
         (!same_language || same_language.length === 0) &&
         (!by_genres || Object.keys(by_genres).length === 0) && (
          <p style={{ color: "#fff" }}>Không có gợi ý nào.</p>
        )}
      </>
    );
  };

  return (
    <StyledRecommendation>
      <h3 style={{ color: "#fff", marginBottom: "10px" }}>Video gợi ý</h3>
      {renderRecommendations()}
    </StyledRecommendation>
  );
};

const StyledRecommendation = styled.div`
  padding: 10px;
  background: #07182e;
  border-radius: 5px;
  max-height: 300px; /* Giới hạn chiều cao tối đa */
  overflow-y: auto; /* Thêm thanh cuộn nếu nội dung vượt quá chiều cao */

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    display: flex; /* Sử dụng flex để căn chỉnh hình ảnh và tiêu đề */
    align-items: center; /* Căn giữa theo chiều dọc */
    padding: 8px; /* Giảm padding để tiết kiệm không gian */
    margin-bottom: 5px; /* Giảm margin để danh sách gọn hơn */
    border-radius: 5px;
  }

  li:hover {
    background: #1a2b4c;
  }

  img {
    flex-shrink: 0; /* Đảm bảo hình ảnh không bị co lại */
  }

  div {
    flex-grow: 1; /* Tiêu đề chiếm toàn bộ không gian còn lại */
    overflow: hidden; /* Ẩn nội dung tràn */
    text-overflow: ellipsis; /* Thêm dấu ... nếu tiêu đề quá dài */
    white-space: nowrap; /* Ngăn tiêu đề xuống dòng */
  }
`;

export default RecommendationSection;