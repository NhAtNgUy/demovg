from fastapi import FastAPI, Form, HTTPException, Query, BackgroundTasks, File, UploadFile
from typing import Tuple, List, Dict, Any
import os
from fastapi.middleware.cors import CORSMiddleware
from googleapiclient.discovery import build
import requests
import re
import pandas as pd
from datetime import datetime
import sqlite3
import unicodedata
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import random
import yt_dlp
import librosa
import numpy as np
from demucs.separate import main as demucs_separate
import tensorflow as tf
import time
import tempfile
import base64
import tensorflow_hub as hub
from bs4 import BeautifulSoup
from google.cloud import firestore
import firebase_admin
from firebase_admin import credentials, firestore, initialize_app
from scipy.stats import entropy

# Khởi tạo Firebase Admin SDK
if not firebase_admin._apps:
    cred = credentials.Certificate('/etc/secrets/credentials.json')
initialize_app(cred)
db = firestore.client()

current_year = datetime.now().year
data = {
    "Giới Trẻ": ['Pop', 'rap', 'hip-hop', 'indie', 'dance', 'nhạc Nhật', 'rock ', 'ballad', 'RnB', 'K-pop', 'nhạc trung', 'nhạc chế', 'nhạc Nga'],
    "Trung Niên": ['trữ tình', 'vàng', 'bolero', 'nhạc quê hương', 'nhạc hải ngoại', 'ballad ', 'rock', 'nhạc latin', 'bolero', 'ballad', 'nhạc quê hương', 'nhạc trung', 'nhạc Nga'],
    "Người già": ['dân ca', 'truyền thống', 'cải lương', 'cách mạng', 'bolero', 'cổ điển', 'trữ trình', 'vàng', 'nhạc quê hương', 'trèo', 'bolero', 'cách mạng', 'nhạc Nga']
}
df = pd.DataFrame(data=data)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://kcms-59437.web.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



YOUTUBE_API_KEY = "AIzaSyBr-OZMcXcKGEkEnVbx5Qn2YBfSqkRcxiQ"
youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
VGGISH_MODEL_DIR = "./vggish_manual"
vggish_model = tf.saved_model.load(VGGISH_MODEL_DIR)
yamnet_MODEL_DIR = "./yamnet_model"
yamnet_model = tf.saved_model.load(yamnet_MODEL_DIR)

# Thư mục lưu trữ file âm thanh
AUDIO_STORAGE_DIR = "audio_files"
TEST_AUDIO_DIR = "test_audio"
if not os.path.exists(AUDIO_STORAGE_DIR):
    os.makedirs(AUDIO_STORAGE_DIR)
if not os.path.exists(TEST_AUDIO_DIR):
    os.makedirs(TEST_AUDIO_DIR)

# Kết nối tới SQLite database
def get_db_connection():
    conn = sqlite3.connect('youtube_videos.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS videos (
            video_id TEXT PRIMARY KEY,
            title TEXT,
            view_count TEXT,
            thumbnail TEXT,
            artist TEXT,
            genre TEXT,
            lyric TEXT,
            language TEXT,
            emotions TEXT,
            ref_audio_path TEXT,
            accompaniment_audio_path TEXT
        )
    ''')
    try:
        cursor.execute('ALTER TABLE videos ADD COLUMN ref_audio_path TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute('ALTER TABLE videos ADD COLUMN accompaniment_audio_path TEXT')
    except sqlite3.OperationalError:
        pass
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_artist ON videos(artist)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_genre ON videos(genre)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_language ON videos(language)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_emotions ON videos(emotions)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_view_count ON videos(view_count)')
    conn.commit()
    return conn, cursor

def get_dbtrend_connection():
    conn = sqlite3.connect('videos.db')
    conn.row_factory = sqlite3.Row
    return conn, conn.cursor()

# Chuyển đổi chuỗi có dấu thành không dấu
def remove_accents(input_str):
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return ''.join([c for c in nfkd_form if not unicodedata.combining(c)])

# Tải từ YouTube
async def download_youtube_audio(video_id: str, output_dir: str = AUDIO_STORAGE_DIR) -> Tuple[str, bool]:
    output_dir = os.path.join(output_dir, video_id)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    output_file = os.path.join(output_dir, f"{video_id}.m4a")
    youtube_url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'm4a',
            'preferredquality': '128',
        }],
        'outtmpl': output_file.replace('.m4a', '.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
        return output_file, True
    except Exception as e:
        print(f"Lỗi khi tải âm thanh từ {youtube_url}: {e}")
        return None, False

# Tách âm thanh bằng Demucs
def separate_audio(input_file: str, video_id: str) -> Tuple[str, str]:
    output_dir = os.path.join(AUDIO_STORAGE_DIR, video_id)
    demucs_separate([
        "--two-stems", "vocals",
        "-n", "htdemucs",
        "-o", output_dir,
        input_file
    ])
    vocals_path = os.path.join(output_dir, "htdemucs", video_id, "vocals.wav")
    no_vocals_path = os.path.join(output_dir, "htdemucs", video_id, "no_vocals.wav")
    return vocals_path, no_vocals_path

# Tìm bài hát gốc từ title
async def find_original_song(title: str) -> dict:
    query = re.sub(r'\bkaraoke\b', '', title, flags=re.IGNORECASE).strip()
    try:
        request = youtube.search().list(
            q=query,
            part="snippet",
            type="video",
            maxResults=1,
            order="relevance"
        )
        response = request.execute()
        if response['items']:
            item = response['items'][0]
            video_id = item['id']['videoId']
            video_title = item['snippet']['title']
            if "karaoke" not in video_title.lower():
                return {"video_id": video_id, "title": video_title}
        return {}
    except Exception as e:
        print(f"Error searching original song {query}: {str(e)}")
        return {}

# Lưu file âm thanh vào database
def save_audio_to_db(video_id: str, ref_audio_path: str, accompaniment_audio_path: str):
    conn, cursor = get_db_connection()
    cursor.execute('''
        UPDATE videos
        SET ref_audio_path = ?, accompaniment_audio_path = ?
        WHERE video_id = ?
    ''', (ref_audio_path, accompaniment_audio_path, video_id))
    conn.commit()
    conn.close()

# Lấy đặc trưng âm thanh
def get_vggish_embedding(audio):
    audio_tensor = tf.convert_to_tensor(audio, dtype=tf.float32)
    audio_tensor = tf.clip_by_value(audio_tensor, -1.0, 1.0)
    embedding = vggish_model(audio_tensor)
    return embedding.numpy()[0]

def extract_features(audio_path, duration=110):
    y, sr = librosa.load(audio_path, duration=duration)
    f0, _, _ = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
    energy = librosa.feature.rms(y=y)[0]
    energy_mean = np.mean(energy)
    energy_std = np.std(energy)
    samples_per_second = sr
    segment_length = samples_per_second
    segments = [y[i:i+segment_length] for i in range(0, len(y), segment_length) if len(y[i:i+segment_length]) == segment_length]
    embeddings = []
    for segment in segments:
        try:
            embedding = get_vggish_embedding(segment)
            embeddings.append(embedding)
        except Exception as e:
            print(f"Error processing segment: {str(e)}")
            embeddings.append(np.zeros(128))
    embedding_mean = np.mean(embeddings, axis=0) if embeddings else np.zeros(128)
    ideal_embedding = np.zeros(128)
    timbre_distance = np.linalg.norm(embedding_mean - ideal_embedding)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    harmony_similarity = np.mean([np.corrcoef(chroma[:, t], chroma[:, t])[0, 1] for t in range(chroma.shape[1]) if not np.isnan(np.corrcoef(chroma[:, t], chroma[:, t])[0, 1])])
    return np.nan_to_num(f0), energy_mean, energy_std, timbre_distance, harmony_similarity

def score_pitch_stability(pitch):
    valid_pitches = pitch[pitch > 0]
    if len(valid_pitches) < 10:  # Require more pitches for robustness
        print("Returning 0 due to insufficient valid pitches")
        return 0.0
    # Compute pitch entropy (discretize pitches into bins)
    hist, bins = np.histogram(valid_pitches, bins=50, density=True)
    pitch_entropy = entropy(hist + 1e-10)  # Avoid log(0)
    max_entropy = np.log2(50)  # Maximum entropy for 50 bins
    entropy_score = max(0, 100 - (pitch_entropy / max_entropy) * 100)
    # Compute smoothness (mean absolute difference between consecutive pitches)
    pitch_diff = np.abs(np.diff(valid_pitches))
    smoothness = max(0, 100 - np.mean(pitch_diff) * 5)  # Adjust multiplier
    score = 0.5 * entropy_score + 0.5 * smoothness
    print(f"Pitch entropy score: {entropy_score}, Smoothness: {smoothness}, Final score: {score}")
    return round(score, 2)

def score_energy_consistency(energy_std):
    score = max(0, 100 - energy_std * 500)  # Lower std means more consistent dynamics
    return round(score, 2)

def score_timbre(timbre_distance):
    score = max(0, 100 - timbre_distance * 10)  # Lower distance means better timbre quality
    return round(score, 2)

def score_harmony(harmony_similarity):
    score = min(100, harmony_similarity * 100)  # Higher similarity means better harmony
    return round(score, 2)

# Tìm kiếm từ database
def search_from_db(query):
    conn, cursor = get_db_connection()
    query_no_accents = remove_accents(query.lower())
    query_no_accents = query_no_accents.replace(" ", "")
    query_no_accents = re.sub(r'[^a-z0-9\s]', '', query_no_accents)
    cursor.execute('SELECT video_id, title, view_count, thumbnail, artist, genre, language, emotions FROM videos')
    results = []
    for row in cursor.fetchall():
        video_id, title, view_count, thumbnail, artist, genre, language, emotions = row
        title_no_accents = remove_accents(title.lower())
        title_no_accents = title_no_accents.replace(" ", "")
        if query_no_accents in title_no_accents:
            results.append({
                "videoId": video_id,
                "title": title,
                "viewCount": view_count,
                "thumbnail": thumbnail,
                "artist": artist or 'Unknown',
                "genre": genre or 'Unknown',
                "language": language or 'Unknown',
                "emotions": emotions or 'Unknown'
            })
    conn.close()
    return results

# Lưu dữ liệu vào database và Google Sheet
def save_to_db(video_data):
    video_data['artist'] = video_data.get('artist', 'Unknown')
    video_data['genre'] = video_data.get('genre', 'Unknown')
    video_data['language'] = video_data.get('language', 'Unknown')
    video_data['emotions'] = video_data.get('emotions', 'Unknown')
    conn, cursor = get_db_connection()
    cursor.execute('''
        INSERT OR REPLACE INTO videos (video_id, title, view_count, thumbnail, artist, genre, language, emotions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        video_data['videoId'],
        video_data['title'],
        video_data['viewCount'],
        video_data['thumbnail'],
        video_data['artist'],
        video_data['genre'],
        video_data['language'],
        video_data['emotions']
    ))
    conn.commit()
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name('path/to/your/credentials.json', scope)  # Thay bằng đường dẫn thực tế
    client = gspread.authorize(creds)
    sheet = client.open_by_key('1A_axOQCvShPDnzpD-wpe3vucgSPJ-g9F8yUcBMHV_l0').sheet1
    new_row = [
        video_data['videoId'],
        video_data['title'],
        video_data['viewCount'],
        video_data['thumbnail'],
        video_data['artist'],
        video_data['genre'],
        video_data['language'],
        video_data['emotions']
    ]
    sheet.append_row(new_row)
    conn.close()

# Tìm kiếm video trên YouTube
def search_youtube_videos(query: str, max_results: int = 10):
    try:
        request = youtube.search().list(
            q=f'"Karaoke {query}"',
            part="snippet",
            type="video",
            maxResults=max_results,
            order="relevance"
        )
        response = request.execute()
        video_ids = [item['id']['videoId'] for item in response['items']]
        video_request = youtube.videos().list(part="snippet,statistics", id=','.join(video_ids))
        video_response = video_request.execute()
        return [
            {
                'videoId': item['id'],
                'title': item['snippet']['title'],
                'viewCount': item['statistics'].get('viewCount', 'N/A'),
                'thumbnail': item['snippet']['thumbnails']['default']['url']
            }
            for item in video_response['items']
            if "karaoke" in item['snippet']['title'].lower()
        ]
    except Exception as e:
        print(f"Error searching {query}: {str(e)}")
        return []

# Kiểm tra tương đồng thể loại
def is_genre_similar(genre1, genre2):
    if genre1 == genre2:
        return True
    genre1_parts = genre1.lower().split('/')
    genre2_parts = genre2.lower().split('/')
    for part1 in genre1_parts:
        for part2 in genre2_parts:
            if part1 in part2 or part2 in part1:
                return True
    return False

# Endpoint kiểm tra tiêu đề
@app.get("/check-title")
async def check_title(title: str = Query(..., min_length=1)):
    conn, cursor = get_db_connection()
    cursor.execute('SELECT video_id, title, view_count, thumbnail, artist, genre, language, emotions FROM videos WHERE title = ?', (title,))
    result = cursor.fetchone()
    conn.close()
    if result:
        video_id, title, view_count, thumbnail, artist, genre, language, emotions = result
        return {
            "found": True,
            "message": "Thấy",
            "video": {
                "videoId": video_id,
                "title": title,
                "viewCount": view_count,
                "thumbnail": thumbnail,
                "artist": artist or "Unknown",
                "genre": genre or "Unknown",
                "language": language or "Unknown",
                "emotions": emotions or "Unknown",
            }
        }
    return {"found": False, "message": "Không thấy"}

# Endpoint để lấy gợi ý
@app.get("/recommend")
async def recommend(video_id: str = Query(..., min_length=1)):
    conn, cursor = get_db_connection()
    cursor.execute('SELECT video_id, title, artist, genre, language, emotions, view_count, thumbnail FROM videos WHERE video_id = ?', (video_id,))
    selected_song = cursor.fetchone()
    
    if not selected_song:
        conn.close()
        raise HTTPException(status_code=404, detail="Video not found in database")

    selected_video_id, selected_title, selected_artist, selected_genre, selected_language, selected_emotions, selected_view_count, selected_thumbnail = selected_song

    recommendations = {}
    used_video_ids = {selected_video_id}  # Tránh trùng lặp, không gợi ý chính video đang chọn

    if selected_artist == "Unknown" or selected_genre == "Unknown":
        recommendations["by_genres"] = {}

        # Lấy tất cả thể loại từ database videos
        cursor.execute('SELECT DISTINCT genre FROM videos WHERE genre IS NOT NULL AND genre != ""')
        all_genres = [row[0] for row in cursor.fetchall()]

        # Truy vấn một lần và nhóm theo thể loại
        cursor.execute('SELECT video_id, title, view_count, thumbnail, artist, genre FROM videos')
        videos_by_genre = {}
        for row in cursor.fetchall():
            video_id, title, view_count, thumbnail, artist, video_genre = row
            if video_id in used_video_ids:
                continue
            for genre in all_genres:
                if is_genre_similar(genre, video_genre):
                    if genre not in videos_by_genre:
                        videos_by_genre[genre] = []
                    videos_by_genre[genre].append({
                        "videoId": video_id,
                        "title": title,
                        "viewCount": view_count,
                        "thumbnail": thumbnail,
                        "artist": artist,
                        "genre": video_genre
                    })
                    used_video_ids.add(video_id)
                    break

        for genre in all_genres:
            videos = videos_by_genre.get(genre, [])
            if videos: 
                random.shuffle(videos)
                # Chọn ngẫu nhiên 5 bài từ tất cả các bài của thể loại
                selected_videos = random.sample(videos, min(5, len(videos))) if videos else []
                recommendations["by_genres"][genre] = selected_videos

                # In các tiêu đề bài hát được chọn cho thể loại này
                print(f"\nRecommendations for genre '{genre}':")
                for video in selected_videos:
                    print(f"- {video['title']}")
            else:
                recommendations["by_genres"][genre] = []
                print("No recommendations available.")
    else:
        # Gợi ý bài hát cùng tác giả
        same_artist_results = []
        cursor.execute('SELECT video_id, title, view_count, thumbnail, artist, genre FROM videos WHERE artist = ? AND video_id != ?', (selected_artist, selected_video_id))
        for row in cursor.fetchall():
            video_id, title, view_count, thumbnail, artist, genre = row
            same_artist_results.append({
                "videoId": video_id,
                "title": title,
                "viewCount": view_count,
                "thumbnail": thumbnail,
                "artist": artist,
                "genre": genre
            })
        same_artist_results.sort(key=lambda x: int(x['viewCount']) if x['viewCount'].isdigit() else 0, reverse=True)
        same_artist_results = same_artist_results[:5]
        recommendations["same_artist"] = same_artist_results

        # In các tiêu đề bài hát cùng tác giả
        print("\nRecommendations for same artist:")
        if same_artist_results:
            for video in same_artist_results:
                print(f"- {video['title']}")
        else:
            print("No recommendations available.")

        # Gợi ý bài hát cùng thể loại, khác tác giả
        same_genre_results = []
        cursor.execute('SELECT video_id, title, view_count, thumbnail, artist, genre FROM videos WHERE artist != ? AND genre LIKE ?', (selected_artist, f'%{selected_genre}%'))
        for row in cursor.fetchall():
            video_id, title, view_count, thumbnail, artist, genre = row
            if is_genre_similar(selected_genre, genre):
                same_genre_results.append({
                    "videoId": video_id,
                    "title": title,
                    "viewCount": view_count,
                    "thumbnail": thumbnail,
                    "artist": artist,
                    "genre": genre
                })
        same_genre_results.sort(key=lambda x: int(x['viewCount']) if x['viewCount'].isdigit() else 0, reverse=True)
        same_genre_results = same_genre_results[:5]
        recommendations["same_genre_different_artist"] = same_genre_results

        # In các tiêu đề bài hát cùng thể loại, khác tác giả
        print("\nRecommendations for same genre, different artist:")
        if same_genre_results:
            for video in same_genre_results:
                print(f"- {video['title']}")
        else:
            print("No recommendations available.")

    # Gợi ý bài hát cùng cảm xúc (Buồn, Vui)
    same_emotions_results = []
    if selected_emotions != "Unknown":
        cursor.execute('SELECT video_id, title, view_count, thumbnail, artist, genre FROM videos WHERE emotions = ? AND video_id != ?', (selected_emotions, selected_video_id))
        for row in cursor.fetchall():
            video_id, title, view_count, thumbnail, artist, genre = row
            if video_id not in used_video_ids:
                same_emotions_results.append({
                    "videoId": video_id,
                    "title": title,
                    "viewCount": view_count,
                    "thumbnail": thumbnail,
                    "artist": artist,
                    "genre": genre
                })
                used_video_ids.add(video_id)
        # Chọn ngẫu nhiên 5 bài từ tất cả các bài phù hợp
        same_emotions_results = random.sample(same_emotions_results, min(5, len(same_emotions_results))) if same_emotions_results else []
    recommendations["same_emotions"] = same_emotions_results

    # In các tiêu đề bài hát cùng cảm xúc
    print("\nRecommendations for same emotions:")
    if same_emotions_results:
        for video in same_emotions_results:
            print(f"- {video['title']}")
    else:
        print("No recommendations available.")

    # Gợi ý bài hát cùng ngôn ngữ
    same_language_results = []
    if selected_language != "Unknown":
        cursor.execute('SELECT video_id, title, view_count, thumbnail, artist, genre FROM videos WHERE language = ? AND video_id != ?', (selected_language, selected_video_id))
        for row in cursor.fetchall():
            video_id, title, view_count, thumbnail, artist, genre = row
            if video_id not in used_video_ids:
                same_language_results.append({
                    "videoId": video_id,
                    "title": title,
                    "viewCount": view_count,
                    "thumbnail": thumbnail,
                    "artist": artist,
                    "genre": genre
                })
                used_video_ids.add(video_id)
        # Chọn ngẫu nhiên 5 bài từ tất cả các bài phù hợp
        same_language_results = random.sample(same_language_results, min(5, len(same_language_results))) if same_language_results else []
    recommendations["same_language"] = same_language_results

    # In các tiêu đề bài hát cùng ngôn ngữ
    print("\nRecommendations for same language:")
    if same_language_results:
        for video in same_language_results:
            print(f"- {video['title']}")
    else:
        print("No recommendations available.")

    # Thêm phần gợi ý: 5 video có view_count cao nhất cho mỗi thể loại
    recommendations["top_viewed_by_genre"] = {}
    cursor.execute('SELECT DISTINCT genre FROM videos WHERE genre IS NOT NULL AND genre != ""')
    all_genres = [row[0] for row in cursor.fetchall()]

    for genre in all_genres:
        cursor.execute('SELECT video_id, title, view_count, thumbnail, artist, genre FROM videos WHERE genre LIKE ? ORDER BY CAST(view_count AS INTEGER) DESC LIMIT 5', (f'%{genre}%',))
        top_viewed_videos = []
        for row in cursor.fetchall():
            video_id, title, view_count, thumbnail, artist, video_genre = row
            top_viewed_videos.append({
                "videoId": video_id,
                "title": title,
                "viewCount": view_count,
                "thumbnail": thumbnail,
                "artist": artist,
                "genre": video_genre
            })
        recommendations["top_viewed_by_genre"][genre] = top_viewed_videos

        # In các tiêu đề bài hát có view_count cao nhất cho thể loại này
        print(f"\nTop viewed videos for genre '{genre}':")
        if top_viewed_videos:
            for video in top_viewed_videos:
                print(f"- {video['title']} (Views: {video['viewCount']})")
        else:
            print("No videos available.")

    conn.close()
    return recommendations

# Endpoint gợi ý mới cho "Dành Cho Bạn"
@app.get("/recommend-for-you")
async def recommend_for_you(user_id: str = Query(..., min_length=1)):
    try:
        # Lấy 10 video lịch sử gần nhất từ Firestore
        history_ref = db.collection('history').document(user_id).collection('videos')
        history_query = history_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(10)
        history_docs = history_query.stream()
        history_videos = [
            {
                'videoId': doc.to_dict().get('videoId'),
                'genre': doc.to_dict().get('genre', 'Unknown')
            } for doc in history_docs
        ]
        history_video_ids = {video['videoId'] for video in history_videos if video['videoId']}

        # Lấy tất cả video yêu thích từ Firestore
        favorites_ref = db.collection('favorites').document(user_id).collection('videos')
        favorites_docs = favorites_ref.stream()
        favorites_videos = [
            {
                'videoId': doc.to_dict().get('videoId'),
                'genre': doc.to_dict().get('genre', 'Unknown')
            } for doc in favorites_docs
        ]
        favorites_video_ids = {video['videoId'] for video in favorites_videos if video['videoId']}

        # Kết nối SQLite
        conn, cursor = get_db_connection()

        # Lấy tất cả video từ SQLite
        cursor.execute('SELECT video_id, title, view_count, thumbnail, artist, genre FROM videos')
        all_videos = [
            {
                'videoId': row[0],
                'title': row[1],
                'viewCount': row[2],
                'thumbnail': row[3],
                'artist': row[4] or 'Unknown',
                'genre': row[5] or 'Unknown'
            } for row in cursor.fetchall()
        ]

        # Gợi ý từ lịch sử
        history_recommendations = []
        for video in history_videos:
            genre = video['genre']
            if genre == 'Unknown':
                continue
            # Tìm video có thể loại tương tự
            similar_videos = [
                v for v in all_videos
                if v['videoId'] not in history_video_ids
                and v['videoId'] not in favorites_video_ids
                and is_genre_similar(genre, v['genre'])
            ]
            history_recommendations.extend(similar_videos)
        # Loại bỏ trùng lặp và chọn ngẫu nhiên 10 video
        history_recommendations = list({v['videoId']: v for v in history_recommendations}.values())
        history_recommendations = random.sample(history_recommendations, min(10, len(history_recommendations))) if history_recommendations else []

        # Gợi ý từ yêu thích
        favorites_recommendations = []
        for video in favorites_videos:
            genre = video['genre']
            if genre == 'Unknown':
                continue
            # Tìm video có thể loại tương tự
            similar_videos = [
                v for v in all_videos
                if v['videoId'] not in history_video_ids
                and v['videoId'] not in favorites_video_ids
                and is_genre_similar(genre, v['genre'])
            ]
            favorites_recommendations.extend(similar_videos)
        # Loại bỏ trùng lặp và chọn ngẫu nhiên 10 video
        favorites_recommendations = list({v['videoId']: v for v in favorites_recommendations}.values())
        favorites_recommendations = random.sample(favorites_recommendations, min(10, len(favorites_recommendations))) if favorites_recommendations else []

        conn.close()
        return {
            'history_recommendations': history_recommendations,
            'favorites_recommendations': favorites_recommendations
        }
    except Exception as e:
        print(f"Error in recommend-for-you: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing recommendations: {str(e)}")

# Endpoint xử lý và chấm điểm
@app.post("/process-and-score")
async def process_and_score(
    video_id: str = Form(...),
    user_audio: UploadFile = File(...), 
    background_tasks: BackgroundTasks = None
):
    print(f"Received video_id: {video_id}")
    print(f"Received user_audio: {user_audio.filename}")
    start_time = time.time()
    
    # Lưu file âm thanh tạm thời
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        contents = await user_audio.read()
        tmp.write(contents)
        user_audio_path = tmp.name

    try:
        print("Extracting audio features...")
        user_pitch, user_energy_mean, user_energy_std, user_timbre, user_harmony = extract_features(user_audio_path)
        print("Calculating scores...")
        pitch_score = score_pitch_stability(user_pitch)
        energy_score = score_energy_consistency(user_energy_std)
        timbre_score = score_timbre(user_timbre)
        harmony_score = score_harmony(user_harmony)
        final_score = (
            0.2 * pitch_score +
            0.2 * energy_score +
            0.3 * timbre_score +
            0.3 * harmony_score
        )
        elapsed = time.time() - start_time
        return {
            "pitch_accuracy": pitch_score,
            "energy_score": energy_score,
            "timbre_score": timbre_score,
            "harmony_score": harmony_score,
            "final_score": round(final_score, 2),
            "elapsed_time": round(elapsed, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    finally:
        # Xóa file tạm sau khi xử lý
        if os.path.exists(user_audio_path):
            os.unlink(user_audio_path)
            
# Endpoint tìm kiếm bài hát
@app.get("/search")
async def search_song(q: str = Query(..., min_length=1), background_tasks: BackgroundTasks = None):
    print(f"Received query: {q}")
    words = q.split()
    words_select = [i.lower() for i in words if i.lower() != 'karaoke']
    q_new = ' '.join(words_select)
    print(f"Processed query (q_new): {q_new}")
    db_results = search_from_db(q_new)
    if db_results:
        print("Results found in database")
        return {"results": db_results}
    print("No results in database, searching YouTube API")
    yt_results = search_youtube_videos(q_new)
    for video in yt_results:
        background_tasks.add_task(save_to_db, video)
    return {"results": yt_results}

# Endpoint lấy video trending
@app.get("/trending")
async def get_trending_videos() -> List[Dict[str, Any]]:
    try:
        conn, cursor = get_dbtrend_connection()
        cursor.execute("SELECT * FROM trending_videos")
        videos = cursor.fetchall()
        conn.close()
        trending_videos = [
            {
                "videoId": video["video_id"],
                "title": video["title"],
                "thumbnail": video["thumbnail"],
                "viewCount": video["view_count"],
            }
            for video in videos
        ]
        return trending_videos
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# Phân tích lyric và audio
def get_words_per_line(lyrics_text):
    lines = [line.strip() for line in lyrics_text.strip().split('\n') if line.strip()]
    if not lines:
        raise ValueError("Lyric rỗng hoặc không hợp lệ.")
    words_per_line = [len(line.split()) for line in lines]
    total_words = sum(words_per_line)
    line_words = [line.split() for line in lines]
    return words_per_line, total_words, line_words

def analyze_audio(audio_path, lyrics_text):
    words_per_line, total_words, line_words = get_words_per_line(lyrics_text)
    try:
        audio, sr = librosa.load(audio_path, sr=16000)
        duration = librosa.get_duration(y=audio, sr=sr)
        print(f"Audio duration: {duration:.2f}s")
    except Exception as e:
        raise ValueError(f"Failed to load audio: {str(e)}")
    scores, embeddings, spectrogram = yamnet_model(audio)
    spectrogram_np = spectrogram.numpy()
    onset_envelope = librosa.onset.onset_strength(S=spectrogram_np, sr=sr)
    onset_frames = librosa.onset.onset_detect(
        onset_envelope=onset_envelope,
        sr=sr,
        hop_length=256,
        delta=0.08,
        backtrack=True
    )
    onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=256)
    print(f"Detected {len(onset_times)} onsets: {onset_times.tolist()}")
    try:
        tempo, beat_frames = librosa.beat.beat_track(y=audio, sr=sr, hop_length=256)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=256)
        print(f"Detected {len(beat_times)} beats: {beat_times.tolist()}")
    except:
        beat_times = []
        print("Failed to detect beats, falling back to duration-based timing")
    word_times = []
    if len(onset_times) >= total_words:
        word_times = onset_times[:total_words]
    else:
        if len(beat_times) > 1:
            avg_time_per_beat = min(np.mean(np.diff(beat_times)), duration / total_words)
            word_times = []
            current_time = 0
            for _ in range(total_words):
                if current_time <= duration:
                    word_times.append(current_time)
                    current_time += avg_time_per_beat
                else:
                    word_times.append(duration)
        else:
            avg_time_per_word = duration / total_words
            word_times = [min(i * avg_time_per_word, duration) for i in range(total_words)]
    word_times = [min(max(0, t), duration) for t in word_times]
    print(f"Word times: {word_times}")
    segments = []
    current_index = 0
    prev_end = 0
    for i, num_words in enumerate(words_per_line):
        if num_words <= 0:
            continue
        if current_index < len(word_times):
            start_time = word_times[current_index]
        else:
            start_time = prev_end
        if current_index + num_words - 1 < len(word_times):
            end_time = word_times[current_index + num_words - 1]
        else:
            end_time = duration
        if i > 0:
            start_time = prev_end
        segments.append({"start": start_time, "end": end_time})
        prev_end = end_time
        current_index += num_words
    current_word_index = 0
    for line_idx, (words, num_words) in enumerate(zip(line_words, words_per_line)):
        if num_words <= 0:
            continue
        line_word_times = word_times[current_word_index:current_word_index + num_words]
        print(f"Line {line_idx + 1}:")
        for word, time in zip(words, line_word_times):
            print(f"  {word}: {time:.2f}s")
        current_word_index += num_words
    print(f"Segments: {segments}")
    return segments

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
import os
import tempfile
import base64
import logging
from uuid import uuid4
import shutil
from demucs.separate import main as demucs_separate
import librosa
import soundfile as sf
import pydub

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Suppress librosa deprecation warnings
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

# Ensure audio_files directory exists
AUDIO_STORAGE_DIR = "audio_files"
if not os.path.exists(AUDIO_STORAGE_DIR):
    os.makedirs(AUDIO_STORAGE_DIR)
    logger.info(f"Created directory: {AUDIO_STORAGE_DIR}")

# Existing imports and app setup should remain unchanged
# This is just the updated endpoint

@app.post("/analyze_audio")
async def analyze_audio_route(audio: UploadFile = File(...), lyrics: str = Form(...)):
    audio_path = None
    wav_path = None
    output_dir = None
    try:
        if not audio:
            raise HTTPException(status_code=400, detail="No audio file provided")
        if not lyrics:
            raise HTTPException(status_code=400, detail="No lyrics provided")

        # Generate a unique video_id
        video_id = str(uuid4())
        logger.info(f"Generated video_id: {video_id}")

        # Save uploaded audio to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp:
            contents = await audio.read()
            tmp.write(contents)
            audio_path = tmp.name
        logger.info(f"Saved uploaded audio to: {audio_path}")

        # Convert to WAV for Demucs and librosa compatibility
        wav_path = audio_path.replace('.mp3', '.wav')
        try:
            pydub.AudioSegment.from_file(audio_path).export(wav_path, format='wav')
            logger.info(f"Converted input audio to WAV: {wav_path}")
        except Exception as e:
            logger.error(f"Failed to convert audio to WAV: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Audio conversion failed: {str(e)}")

        # Verify WAV file exists and is valid
        if not os.path.exists(wav_path):
            logger.error(f"WAV file not found at: {wav_path}")
            raise HTTPException(status_code=500, detail="WAV file not generated")
        try:
            audio, sr = sf.read(wav_path)
            logger.info(f"Verified input WAV: duration={len(audio)/sr:.2f}s")
        except Exception as e:
            logger.error(f"Failed to verify input WAV: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Invalid input WAV file: {str(e)}")

        # Separate vocals and instrumental using Demucs
        output_dir = os.path.join(AUDIO_STORAGE_DIR, video_id)
        logger.info(f"Separating audio to: {output_dir}")
        try:
            demucs_separate([
                "--two-stems", "vocals",
                "-n", "htdemucs",
                "-o", output_dir,
                wav_path
            ])
        except Exception as e:
            logger.error(f"Demucs separation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Audio separation failed: {str(e)}")

        # Log contents of Demucs output directory
        demucs_output_dir = os.path.join(output_dir, "htdemucs")
        if os.path.exists(demucs_output_dir):
            for root, _, files in os.walk(demucs_output_dir):
                for file in files:
                    logger.info(f"Found Demucs output file: {os.path.join(root, file)}")
        else:
            logger.error(f"Demucs output directory not found: {demucs_output_dir}")
            raise HTTPException(status_code=500, detail="Demucs output directory not created")

        # Determine actual output file names (Demucs uses input file base name)
        input_base_name = os.path.splitext(os.path.basename(wav_path))[0]
        vocals_path = os.path.join(output_dir, "htdemucs", input_base_name, "vocals.wav")
        no_vocals_path = os.path.join(output_dir, "htdemucs", input_base_name, "no_vocals.wav")
        logger.info(f"Checking vocals path: {vocals_path}")
        logger.info(f"Checking no_vocals path: {no_vocals_path}")

        # Verify that the instrumental file was created
        if not os.path.exists(no_vocals_path):
            logger.error(f"Instrumental file not found at: {no_vocals_path}")
            raise HTTPException(status_code=500, detail=f"Instrumental file not generated at {no_vocals_path}")

        # Test loading the instrumental file with soundfile
        try:
            audio, sr = sf.read(no_vocals_path)
            logger.info(f"Loaded instrumental audio with soundfile: duration={len(audio)/sr:.2f}s")
        except Exception as e:
            logger.error(f"Failed to load instrumental audio with soundfile: {str(e)}")
            try:
                audio, sr = librosa.load(no_vocals_path, sr=16000)
                logger.info(f"Fell back to librosa: duration={librosa.get_duration(y=audio, sr=sr):.2f}s")
            except Exception as e:
                logger.error(f"Failed to load instrumental audio with librosa: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to load instrumental audio: {str(e)}")

        # Analyze the instrumental audio with lyrics
        logger.info(f"Analyzing instrumental audio: {vocals_path}")
        try:
            segments = analyze_audio(vocals_path, lyrics)
        except Exception as e:
            logger.error(f"Failed to analyze audio: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")

        # Read and encode the WAV audio
        try:
            with open(no_vocals_path, "rb") as f:
                audio_data = base64.b64encode(f.read()).decode('utf-8')
            audio_data = f"data:audio/wav;base64,{audio_data}"
            logger.info("Encoded WAV instrumental audio to base64")
        except Exception as e:
            logger.error(f"Failed to encode WAV audio: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Audio encoding failed: {str(e)}")

        # Save to database (handle errors gracefully)
        try:
            save_audio_to_db(video_id, wav_path, no_vocals_path)
            logger.info(f"Saved audio paths to database for video_id: {video_id}")
        except Exception as e:
            logger.warning(f"Failed to save to database, continuing: {str(e)}")

        return {"segments": segments, "audio_data": audio_data}
    except Exception as e:
        logger.error(f"Error in analyze_audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    finally:
        # Clean up temporary files and Demucs output
        try:
            for path in [audio_path, wav_path] if 'audio_path' in locals() else []:
                if path and os.path.exists(path):
                    os.unlink(path)
                    logger.info(f"Deleted temporary file: {path}")
            if output_dir and os.path.exists(output_dir):
                shutil.rmtree(output_dir)
                logger.info(f"Deleted output directory: {output_dir}")
        except Exception as e:
            logger.warning(f"Failed to clean up files: {str(e)}")

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
