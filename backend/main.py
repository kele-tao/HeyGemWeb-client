import requests
import os
from uuid import uuid4
from moviepy.editor import VideoFileClip
import time
import random
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body, Query
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from starlette.staticfiles import StaticFiles
from pydantic import BaseModel
import shutil
import json
from datetime import datetime
import asyncio
from fastapi.middleware.cors import CORSMiddleware

# Create a FastAPI application
app = FastAPI()

# --- CORS Middleware ---
# This is essential for a decoupled frontend/backend.
# It allows the frontend (running on a different origin) to make requests to this backend.
origins = [
    "http://localhost",
    "http://localhost:80",
    "http://localhost:8080",
    # Add the domain of your frontend if it's deployed elsewhere
    # "http://your-frontend-domain.com", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Directory and File Definitions ---
DB_FILE = "huiying_ai_db.json"
VOICE_DATA_DIR = "/root/heygem_data/voice/data"
FACE_TEMP_DIR = "/root/heygem_data/face2face/temp"
AVATAR_DIR = "static_avatars"
STATIC_DIR = "static_files"
AUDITION_CACHE_DIR = os.path.join(STATIC_DIR, "audition_cache")

# Create necessary directories on startup
os.makedirs(VOICE_DATA_DIR, exist_ok=True)
os.makedirs(FACE_TEMP_DIR, exist_ok=True)
os.makedirs(AVATAR_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(AUDITION_CACHE_DIR, exist_ok=True)

# Mount static directories to serve generated files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/avatars", StaticFiles(directory=AVATAR_DIR), name="avatars")

# --- Background Worker for Video Synthesis ---
synthesis_queue = asyncio.Queue()
synthesis_lock = asyncio.Lock()

async def video_synthesis_worker():
    """
    A worker that processes video synthesis tasks from a queue one by one.
    """
    while True:
        task = await synthesis_queue.get()
        task_code = task["task_code"]
        async with synthesis_lock:
            try:
                all_data = load_data()
                for video in all_data.get("generatedVideos", []):
                    if video.get("task_code") == task_code:
                        video["status"] = "处理中"
                        break
                save_data(all_data)

                payload = {
                    "audio_url": task["audio_url"],
                    "video_url": task["video_url"],
                    "code": task_code,
                    "chaofen": 0, "watermark_switch": 0, "pn": 1
                }
                response = requests.post("http://127.0.0.1:8383/easy/submit", json=payload)
                response.raise_for_status()
            except Exception as e:
                all_data = load_data()
                for video in all_data.get("generatedVideos", []):
                    if video.get("task_code") == task_code:
                        video["status"] = "失败"
                        video["error_message"] = str(e)
                        break
                save_data(all_data)
            finally:
                synthesis_queue.task_done()

@app.on_event("startup")
async def startup_event():
    """
    Start the background worker on application startup.
    """
    asyncio.create_task(video_synthesis_worker())

# --- Data Persistence Helper Functions ---
def load_data():
    """Load data from a JSON file"""
    if not os.path.exists(DB_FILE):
        return {"voices": [], "avatars": [], "generatedVideos": []}
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if "voices" not in data: data["voices"] = []
            if "avatars" not in data: data["avatars"] = []
            if "generatedVideos" not in data: data["generatedVideos"] = []
            return data
    except (json.JSONDecodeError, FileNotFoundError):
        return {"voices": [], "avatars": [], "generatedVideos": []}

def save_data(data):
    """Save data to a JSON file"""
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# --- Pydantic Models for Request Bodies ---
class AppData(BaseModel):
    voices: list
    avatars: list
    generatedVideos: list

class AudioSynthesisRequest(BaseModel):
    text: str
    reference_audio: str
    reference_text: str

class AuditionRequest(BaseModel):
    voice_id: str
    text: str
    reference_audio: str
    reference_text: str

class BatchProgressRequest(BaseModel):
    codes: list[str]

# --- API Endpoints ---
@app.get("/api/data", response_model=AppData)
async def get_data_endpoint():
    """Provide all persisted data"""
    return load_data()

@app.post("/api/data")
async def save_data_endpoint(data: AppData):
    """Save all persisted data"""
    save_data(data.dict())
    return {"message": "Data saved successfully"}

@app.post("/api/model-training")
async def model_training_endpoint(audio_file: UploadFile = File(...)):
    """Model training API"""
    try:
        temp_audio_path = os.path.join(VOICE_DATA_DIR, f"{uuid4()}.wav")
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        url = "http://127.0.0.1:18180/v1/preprocess_and_tran"
        payload = {"format": "wav", "reference_audio": os.path.basename(temp_audio_path), "lang": "zh"}
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        return JSONResponse(content={
            "msg": data.get("msg", "训练成功"),
            "asr_format_audio_url": data.get("asr_format_audio_url"),
            "reference_audio_text": data.get("reference_audio_text")
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"模型训练发生错误: {str(e)}")

@app.post("/api/upload-avatar")
async def upload_avatar_endpoint(title: str = Form(...), video_file: UploadFile = File(...)):
    """Upload an avatar video, generate a thumbnail, and return URLs"""
    file_id = str(uuid4())
    video_filename = f"{file_id}.mp4"
    thumb_filename = f"{file_id}.jpg"
    video_path = os.path.join(AVATAR_DIR, video_filename)
    thumb_path = os.path.join(AVATAR_DIR, thumb_filename)
    try:
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video_file.file, buffer)
        with VideoFileClip(video_path) as clip:
            clip.save_frame(thumb_path, t=0)
        return JSONResponse(content={
            "id": file_id, "title": title, "date": datetime.now().strftime("%Y-%m-%d"),
            "videoUrl": f"/avatars/{video_filename}", "thumbUrl": f"/avatars/{thumb_filename}",
            "videoPath": video_path
        })
    except Exception as e:
        if os.path.exists(video_path): os.remove(video_path)
        if os.path.exists(thumb_path): os.remove(thumb_path)
        raise HTTPException(status_code=500, detail=f"形象上传和处理失败: {str(e)}")

@app.post("/api/audio-synthesis")
async def audio_synthesis_endpoint(request: AudioSynthesisRequest):
    """Audio synthesis API"""
    try:
        payload = {
            "speaker": str(uuid4()), "text": request.text, "format": "wav", "topP": 0.7,
            "max_new_tokens": 1024, "chunk_length": 100, "repetition_penalty": 1.2,
            "temperature": 0.7, "need_asr": False, "streaming": False, "is_fixed_seed": 0, "is_norm": 0,
            "reference_audio": request.reference_audio, "reference_text": request.reference_text
        }
        response = requests.post("http://127.0.0.1:18180/v1/invoke", json=payload)
        response.raise_for_status()
        return HTMLResponse(content=response.content, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"音频合成发生错误: {str(e)}")

@app.post("/api/audition-voice")
async def audition_voice_endpoint(request: AuditionRequest):
    """Generates and caches audition audio."""
    try:
        safe_voice_id = "".join(c for c in request.voice_id if c.isalnum() or c in ('-', '_')).rstrip()
        cached_filename = f"{safe_voice_id}.wav"
        cached_filepath = os.path.join(AUDITION_CACHE_DIR, cached_filename)
        cached_file_url = f"/static/audition_cache/{cached_filename}"

        if os.path.exists(cached_filepath):
            return JSONResponse(content={"url": cached_file_url})

        payload = {
            "speaker": str(uuid4()), "text": request.text, "format": "wav", "topP": 0.7,
            "max_new_tokens": 1024, "chunk_length": 100, "repetition_penalty": 1.2,
            "temperature": 0.7, "need_asr": False, "streaming": False, "is_fixed_seed": 0, "is_norm": 0,
            "reference_audio": request.reference_audio, "reference_text": request.reference_text
        }
        response = requests.post("http://127.0.0.1:18180/v1/invoke", json=payload)
        response.raise_for_status()
        with open(cached_filepath, "wb") as f:
            f.write(response.content)
        return JSONResponse(content={"url": cached_file_url})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"试听音频时发生错误: {str(e)}")

@app.post("/api/video-synthesis")
async def video_synthesis_endpoint(
    audio_file: UploadFile = File(...), video_path: str = Form(...),
    project_title: str = Form(...), avatar_id: str = Form(...)
):
    """Adds a video synthesis task to the queue."""
    try:
        all_data = load_data()
        avatar = next((a for a in all_data.get("avatars", []) if a["id"] == avatar_id), None)
        if not avatar:
            raise HTTPException(status_code=404, detail="Avatar not found")

        temp_audio_path = os.path.join(FACE_TEMP_DIR, f"{uuid4()}.wav")
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
        
        temp_video_path = os.path.join(FACE_TEMP_DIR, f"{uuid4()}.mp4")
        if not os.path.exists(video_path):
             raise HTTPException(status_code=404, detail=f"源视频文件未找到: {video_path}")
        shutil.copy(video_path, temp_video_path)

        task_code = str(uuid4())
        new_video_entry = {
            "id": f"video-{task_code}", "task_code": task_code, "title": project_title,
            "thumbUrl": avatar.get("thumbUrl"), "videoUrl": None, "date": datetime.now().strftime("%Y-%m-%d"),
            "status": "排队中", "avatarId": avatar_id
        }
        all_data["generatedVideos"].insert(0, new_video_entry)
        save_data(all_data)

        await synthesis_queue.put({
            "task_code": task_code,
            "audio_url": os.path.basename(temp_audio_path),
            "video_url": os.path.basename(temp_video_path)
        })
        return JSONResponse(content={"message": "Task queued successfully", "task_code": task_code})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"视频合成任务排队失败: {str(e)}")

@app.post("/api/batch-progress-check")
async def batch_check_progress_endpoint(request: BatchProgressRequest):
    """Checks the progress of multiple synthesis tasks at once."""
    results = []
    all_data = load_data()
    videos_to_update = {v['task_code']: v for v in all_data['generatedVideos'] if v.get('task_code') in request.codes and v.get('status') != '成功'}

    for code in request.codes:
        if code not in videos_to_update:
            continue
        try:
            response = requests.get(f"http://127.0.0.1:8383/easy/query?code={code}")
            response.raise_for_status()
            data = response.json().get("data", {})
            status = data.get("status")
            msg = data.get("msg")
            
            if status == 2: # Success
                result_relative_path = data.get("result")
                if not result_relative_path: raise ValueError("合成结果路径未返回")
                
                result_server_path = os.path.join(FACE_TEMP_DIR, result_relative_path.lstrip('/'))
                if not os.path.exists(result_server_path): raise ValueError(f"合成结果文件未找到: {result_server_path}")

                final_video_name = f"{code}.mp4"
                final_video_path_static = os.path.join(STATIC_DIR, final_video_name)
                shutil.copy(result_server_path, final_video_path_static)
                
                video_url = f"/static/{final_video_name}"
                
                videos_to_update[code]['status'] = '成功'
                videos_to_update[code]['videoUrl'] = video_url
                results.append({"code": code, "status": "成功", "video_url": video_url, "msg": "合成成功"})
            elif status == 1: # Processing
                videos_to_update[code]['status'] = '处理中'
                results.append({"code": code, "status": "处理中", "msg": msg})
            else: # Failed
                videos_to_update[code]['status'] = '失败'
                results.append({"code": code, "status": "失败", "msg": msg or "合成失败"})
        except Exception as e:
            videos_to_update[code]['status'] = '失败'
            results.append({"code": code, "status": "失败", "msg": str(e)})
    
    save_data(all_data)
    return JSONResponse(content=results)

# --- Main Program Entry Point ---
if __name__ == "__main__":
    if not os.path.exists(DB_FILE):
        save_data({"voices": [], "avatars": [], "generatedVideos": []})
    
    print("="*50)
    print("HeyGem AI Backend Service")
    print("Starting server...")
    print("Listening on: http://0.0.0.0:8000")
    print("="*50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
