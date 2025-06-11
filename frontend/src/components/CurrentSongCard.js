import React from "react";
import styled from "styled-components";

const CurrentSongCard = ({ currentVideo }) => {
  if (!currentVideo) return null;

  return (
    <StyledCurrentSongCard>
      <div className="card">
        <div className="top">
          <p className="title-2">Đang Phát</p>
          <div className="pfp">
            <div className="playing">
              <div className="greenline line-1"></div>
              <div className="greenline line-2"></div>
              <div className="greenline line-3"></div>
              <div className="greenline line-4"></div>
              <div className="greenline line-5"></div>
            </div>
          </div>
          <div className="texts">
            <p className="title-1" style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
              {currentVideo.title || "Unknown"}
            </p>
          </div>
        </div>
      </div>
    </StyledCurrentSongCard>
  );
};

const StyledCurrentSongCard = styled.div`
  .card {
    position: fixed;
    top: 10px;
    right: 10px;
    width: 250px;
    height: 70px;
    background: #191414;
    border-radius: 10px;
    padding: 10px;
    overflow: hidden;
    z-index: 1000;
  }
  .top {
    position: relative;
    width: 100%;
    display: flex;
    gap: 10px;
  }
  .pfp {
    position: relative;
    top: 22px;
    left: 5px;
    height: 40px;
    width: 40px;
    background-color: #d2d2d2;
    border-radius: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .texts {
    position: relative;
    top: 2px;
    overflow: hidden;
  }
  .title-1 {
    color: white;
    font-size: 15px;
    font-weight: bolder;
    display: inline-block;
    animation: marquee 20s linear infinite;
  }
  @keyframes marquee {
    0% { transform: translateX(0); }
    25% { transform: translateX(0); }
    100% { transform: translateX(-100%); }
  }
  .title-2 {
    position: absolute;
    color: white;
    font-size: 12px;
    font-weight: bold;
    justify-content: center;
    top: -12px;
  }
  .playing {
    display: flex;
    position: relative;
    justify-content: center;
    gap: 1px;
    width: 30px;
    height: 20px;
  }
  .greenline {
    background-color: #1db954;
    height: 20px;
    width: 2px;
    position: relative;
    transform-origin: bottom;
  }
  .line-1 { animation: playing 1s ease-in-out infinite; animation-delay: 0.2s; }
  .line-2 { animation: playing 1s ease-in-out infinite; animation-delay: 0.5s; }
  .line-3 { animation: playing 1s ease-in-out infinite; animation-delay: 0.6s; }
  .line-4 { animation: playing 1s ease-in-out infinite; animation-delay: 0s; }
  .line-5 { animation: playing 1s ease-in-out infinite; animation-delay: 0.4s; }
  @keyframes playing {
    0% { transform: scaleY(0.1); }
    33% { transform: scaleY(0.6); }
    66% { transform: scaleY(0.9); }
    100% { transform: scaleY(0.1); }
  }
`;

export default CurrentSongCard;