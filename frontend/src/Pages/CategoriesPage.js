import React from "react";
import { Link } from "react-router-dom";
import rapBackground from "../images/rap-background.png";
import popBackground from "../images/pop-background.png";
import indieBackground from "../images/indie-background.png";
import rockBackground from "../images/rock-background.png";
import balladBackground from "../images/ballad-background.png";
import rnbBackground from "../images/rnb-background.png";

const CategoriesPage = () => {
  const categories = [
    { name: "Karaoke Pop", path: "Karaoke Pop" },
    { name: "Karaoke Rap", path: "Karaoke Rap" },
    { name: "Karaoke Indie", path: "Karaoke Indie" },
    { name: "Karaoke Rock", path: "Karaoke Rock" },
    { name: "Karaoke Ballad", path: "Karaoke Ballad" },
    { name: "Karaoke RnB", path: "Karaoke RnB" },
    { name: "Karaoke Bolero", path: "Karaoke Bolero" },
    { name: "Karaoke Nhạc quê hương", path: "Karaoke Nhạc quê hương" },
    { name: "Karaoke Trữ tình", path: "Karaoke Trữ tình" },
    { name: "Karaoke Nhạc Tiếng Trung", path: "Karaoke Nhạc Tiếng Trung" },
    { name: "Karaoke Nhạc Tiếng Nhật", path: "Karaoke Nhạc Tiếng Nhật" },
    { name: "Karaoke Nhạc Tiếng Nga", path: "Karaoke Nhạc Tiếng Nga" },
    { name: "Karaoke Nhạc Tiếng Hàn", path: "Karaoke Nhạc Tiếng Hàn" },
    { name: "Karaoke Nhạc vàng", path: "Karaoke Nhạc vàng" },
    { name: "Karaoke Dân ca", path: "Karaoke Dân ca" },
    { name: "Karaoke Cải lương", path: "Karaoke Cải lương" },
    { name: "Karaoke Cách mạng", path: "Karaoke Cách mạng" },
    { name: "Karaoke Cổ điển", path: "Karaoke Cổ điển" },
    { name: "Karaoke Nhạc trèo", path: "Karaoke Nhạc trèo" },
    { name: "Karaoke Nhạc cách mạng", path: "Karaoke Nhạc cách mạng" },
  ];

  const getBackground = (name) => {
    if (name === "Karaoke Pop") {
      return `url(${popBackground})`;
    } else if (name === "Karaoke Rap") {
      return `url(${rapBackground})`;
    } else if (name === "Karaoke Indie") {
      return `url(${indieBackground})`;
    }
    else if (name === "Karaoke Rock") {
      return `url(${rockBackground})`;
    }
    else if (name === "Karaoke Ballad") {
      return `url(${balladBackground})`;
    }
    else if (name === "Karaoke RnB") {
      return `url(${rnbBackground})`;
    }
      else {
      return "#fff";
    }
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
      <h2 style={{ textAlign: "center", fontSize: "24px", marginBottom: "50px", color: "#ffff" }}>
        Thể loại
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "60px",
          justifyItems: "center",
        }}
      >
        {categories.map((category) => (
          <Link
            key={category.path}
            to={`/categories/${category.path}`}
            style={{ textDecoration: "none" }}
          >
            <div
              className="card"
              style={{
                position: "relative",
                width: "230px",
                height: "130px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                borderRadius: "20px",
                background: getBackground(category.name),
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                fontFamily:
                  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >

              <div
                className="card__img"
                style={{
                  height: "192px",
                  width: "100%",
                }}
              ></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CategoriesPage;