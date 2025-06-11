import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { auth, db } from "../firebaseConfig";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";

const FormContainer = styled.div`
  width: 350px;
  background: rgba(7, 24, 46, 0.8); 
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  padding: 20px;
  text-align: center;
`;

const Header = styled.div`
  background: linear-gradient(to right, #09f, #6f00ff); 
  color: white;
  padding: 20px;
  border-radius: 10px 10px 0 0;
  margin: -20px -20px 20px -20px;
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
`;

const ErrorMessage = styled.p`
  color: #ff4444;
  font-size: 12px;
  margin-bottom: 10px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
  text-align: left;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  color: #ccc; 
  margin-bottom: 5px;
`;

const Input = styled.input`
  width: 95%;
  padding: 10px;
  border: 1px solid #444; 
  border-radius: 5px;
  font-size: 14px;
  outline: none;
  background: #1a2a44; 
  color: #fff; 
  transition: border-color 0.3s;

  &:focus {
    border-color: #09f; 
  }
`;

const AuthButton = styled.button`
  width: 100%;
  padding: 12px;
  background: linear-gradient(to right, #09f, #6f00ff);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.3s;

  &:hover {
    opacity: 0.9;
  }
`;

const ToggleText = styled.p`
  margin-top: 15px;
  font-size: 14px;
  color: #ccc; 
`;

const ToggleLink = styled.span`
  color: #09f; 
  cursor: pointer;
  font-weight: bold;

  &:hover {
    text-decoration: underline;
  }
`;

const HistoryContainer = styled.div`
  margin-top: 20px;
  padding: 20px;
  background: rgba(7, 24, 46, 0.8);
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  max-height: 400px;
  overflow-y: auto;
`;

const HistoryTitle = styled.h3`
  color: #fff;
  margin-bottom: 15px;
`;

const HistoryItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 10px;
  background: #1a2a44;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background: #2a3a54;
  }
`;

const Thumbnail = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 5px;
  margin-right: 10px;
`;

const HistoryInfo = styled.div`
  flex: 1;
`;

const HistoryItemTitle = styled.p`
  color: #fff;
  font-size: 14px;
  margin: 0;
`;

const HistoryItemDetails = styled.p`
  color: #ccc;
  font-size: 12px;
  margin: 0;
`;

const SignOutButton = styled.button`
  width: 100%;
  padding: 12px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 10px;
  transition: opacity 0.3s;

  &:hover {
    opacity: 0.9;
  }
`;

const AuthForm = ({ email, setEmail, password, setPassword, isLogin, setIsLogin, error, handleAuth }) => {
  return (
    <FormContainer>
      <Header>
        <HeaderTitle>{isLogin ? "Sign In" : "Sign Up"}</HeaderTitle>
      </Header>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <FormGroup>
        <Label>Email</Label>
        <Input 
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormGroup>
      <FormGroup>
        <Label>Password</Label>
        <Input 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormGroup>
      <AuthButton onClick={handleAuth}>
        {isLogin ? "Sign In" : "Sign Up"}
      </AuthButton>
      <ToggleText>
        {isLogin ? "Don't have an account?" : "Already have an account?"}
        <ToggleLink onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? " Sign Up" : " Sign In"}
        </ToggleLink>
      </ToggleText>
    </FormContainer>
  );
};

const AuthPage = ({ setSelectedVideo }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Lắng nghe trạng thái đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setHistory([]); // Xóa lịch sử khi người dùng đăng xuất
      }
    });
    return () => unsubscribe();
  }, []);

  // Lấy lịch sử video đã phát từ Firestore
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const historyRef = collection(db, "history", user.uid, "videos");
    const q = query(historyRef, orderBy("timestamp", "desc"), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyList = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data(),
      }));

      // Lọc trùng lặp, giữ mục có timestamp mới nhất cho mỗi videoId
      const uniqueHistory = Object.values(
        historyList.reduce((acc, item) => {
          if (!acc[item.videoId] || item.timestamp > acc[item.videoId].timestamp) {
            acc[item.videoId] = item;
          }
          return acc;
        }, {})
      ).sort((a, b) => b.timestamp - a.timestamp); // Sắp xếp theo timestamp giảm dần

      setHistory(uniqueHistory);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching history:", error);
      setError("Không thể tải lịch sử phát. Vui lòng thử lại sau.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAuth = async () => {
    setError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Đăng nhập thành công!");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Tạo tài khoản thành công!");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      alert("Đăng xuất thành công!");
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePlayHistoryItem = (item) => {
    setSelectedVideo(item.videoId, item.title, {
      videoId: item.videoId,
      title: item.title,
      thumbnail: item.thumbnail,
      viewCount: item.viewCount,
      artist: item.artist,
      genre: item.genre,
      language: item.language,
      emotion: item.emotion,
    });
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      {user ? (
        <div style={{ textAlign: "center" }}>
          <h2 style={{color: "#ffff"}}>Xin chào, {user.email}!</h2>
          <h2 style={{color: "#ffff", fontSize:"20px"}}>Chào mừng bạn tới Vengle - Karaoke</h2>
          {/* Container hiển thị lịch sử video đã phát */}
          <HistoryContainer>
            <HistoryTitle>Lịch sử phát</HistoryTitle>
            {loading ? (
              <p style={{ color: "#ccc" }}>Đang tải lịch sử...</p>
            ) : error ? (
              <p style={{ color: "#ff4444" }}>{error}</p>
            ) : history.length > 0 ? (
              history.map((item) => (
                <HistoryItem
                  key={item.docId}
                  onClick={() => handlePlayHistoryItem(item)}
                >
                  <Thumbnail src={item.thumbnail || "https://via.placeholder.com/60"} alt={item.title} />
                  <HistoryInfo>
                    <HistoryItemTitle>{item.title || "Không có tiêu đề"}</HistoryItemTitle>
                    <HistoryItemDetails>
                      Artist: {item.artist || "Unknown"} | Genre: {item.genre || "Unknown"} | Views: {item.viewCount || 0}
                    </HistoryItemDetails>
                  </HistoryInfo>
                </HistoryItem>
              ))
            ) : (
              <p style={{ color: "#ccc" }}>Chưa có lịch sử phát.</p>
            )}
          </HistoryContainer>

          <SignOutButton onClick={handleSignOut}>Đăng xuất</SignOutButton>
        </div>
      ) : (
        <AuthForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          isLogin={isLogin}
          setIsLogin={setIsLogin}
          error={error}
          handleAuth={handleAuth}
        />
      )}
    </div>
  );
};

export default AuthPage;
