import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

const Button = () => {
  return (
    <StyledWrapper>
      <div className="input">
        <Link to="/account" className="value"><p className="p">TÀI KHOẢN</p></Link>
        <p></p>
        <Link to="/" className="value"><p className="p">TRANG CHỦ</p></Link>
        <p></p>
        <Link to="/search" className="value"><p className="p">TÌM KIẾM</p></Link>
        <p></p>
        <Link to="/favorites" className="value"><p className="p">YÊU THÍCH</p></Link>
        <p></p>
        <Link to="/categories" className="value"><p className="p">THỂ LOẠI</p></Link>
        <p></p>
        <Link to="/create-karaoke" className="value"><p className="p">TẠO KARAOKE</p></Link> {/* Thêm mục mới */}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
.input {
  flex-direction: column;
  width: 231px;
  gap: 5px;
}

.value {
  width: 100%;
  height: 20%;
  background: rgba(7, 24, 46, 0.4);
  position: relative;
  display: flex;
  place-content: center;
  place-items: center;
  overflow: hidden;
  border-radius: 30px;
}

.value::after {
  content: '';
  position: absolute;
  background: rgb(7, 24, 46);
  inset: 5px;
  border-radius: 30px;
} 

.value p {
  color: rgb(234, 238, 241); 
  font-size: 1em;
  font-family: 'Oswald', sans-serif; 
  z-index: 1;
}

.value:hover::before {
  content: '';
  position: absolute;
  width: 100%;
  background-image: linear-gradient(180deg, rgb(0, 183, 255), rgb(255, 48, 255));
  height: 30px;
  animation: rotBGimg 3s linear infinite;
  transition: all 0.2s linear;
}

@keyframes rotBGimg {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.value:focus {
  background-image: linear-gradient(180deg, rgb(0, 183, 255), rgb(255, 48, 255));
}
`;

export default Button;