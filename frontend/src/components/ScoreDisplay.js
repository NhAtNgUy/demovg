import React from 'react';
import styled from 'styled-components';

const ScoreDisplay = ({ scores, onClose }) => {
  if (!scores) return null;

  const { 
    pitch_accuracy,  
    energy_score, 
    timbre_score, 
    harmony_score, 
    final_score, 
    elapsed_time 
  } = scores;

  return (
    <ModalOverlay>
      <ModalContent>
        <h2>Điểm Số Hát Karaoke</h2>
        <ScoreItem>
          <span>Độ chính xác cao độ:</span>
          <span>{pitch_accuracy}/100</span>
        </ScoreItem>
        <ScoreItem>
          <span>Năng lượng:</span>
          <span>{energy_score}/100</span>
        </ScoreItem>
        <ScoreItem>
          <span>Âm sắc:</span>
          <span>{timbre_score}/100</span>
        </ScoreItem>
        <ScoreItem>
          <span>Hòa âm:</span>
          <span>{harmony_score}/100</span>
        </ScoreItem>
        <ScoreItem highlight>
          <span>Điểm tổng:</span>
          <span>{final_score}/100</span>
        </ScoreItem>
        <ScoreItem>
          <span>Thời gian xử lý:</span>
          <span>{elapsed_time} giây</span>
        </ScoreItem>
        <CloseButton onClick={onClose}>Đóng</CloseButton>
      </ModalContent>
    </ModalOverlay>
  );
};

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  width: 400px;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);

  h2 {
    margin-bottom: 20px;
    color: #333;
  }
`;

const ScoreItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  font-size: 16px;
  color: ${props => props.highlight ? '#007bff' : '#333'};
  font-weight: ${props => props.highlight ? 'bold' : 'normal'};
`;

const CloseButton = styled.button`
  margin-top: 20px;
  padding: 10px 20px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background: #0056b3;
  }
`;

export default ScoreDisplay;
