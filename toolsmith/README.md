แน่นอนครับ นี่คือไฟล์ `README.md` ที่อธิบายรายละเอียดการติดตั้งและใช้งานโปรเจกต์เวอร์ชันปรับปรุงใหม่นี้อย่างเป็นขั้นตอน

-----

# Toolsmith - Restructured Edition

**Toolsmith** คือโปรเจกต์สำหรับสร้างชุดโจทย์ปัญหา Competitive Programming โดยอัตโนมัติ โดยใช้สถาปัตยกรรมสมัยใหม่ที่ประกอบด้วย FastAPI, LangGraph, และ Google Gemini API สำหรับการสร้างเนื้อหา และใช้ Supabase เป็นฐานข้อมูลในการจัดเก็บบันทึก

โปรเจกต์นี้ถูกออกแบบมาให้ง่ายต่อการพัฒนาและขยายความสามารถในอนาคต โดยแยกส่วนของ Logic หลักออกจากส่วนของ API อย่างชัดเจน

## ✨ Core Technologies

  - **Backend**: FastAPI
  - **LLM Orchestration**: LangGraph
  - **LLM Model**: Google Gemini API
  - **Database**: Supabase (PostgreSQL)
  - **Configuration**: Pydantic Settings

## 📂 Project Structure

โปรเจกต์นี้แบ่งโครงสร้างออกเป็น 2 ส่วนหลักเพื่อความเป็นระเบียบ:

  - **/app**: ทำหน้าที่เป็น API Layer รับและตอบสนอง HTTP requests โดยตรง
  - **/core**: เป็นแกนหลักของแอปพลิเคชัน ประกอบด้วย Business Logic, Services, การเชื่อมต่อฐานข้อมูล, และการจัดการ Graph ทั้งหมด

## 🚀 การติดตั้งและเริ่มใช้งาน (Setup and Installation)

ทำตามขั้นตอนต่อไปนี้เพื่อติดตั้งและรันโปรเจกต์บนเครื่องของคุณ

### 1\. Clone a Project

เริ่มต้นด้วยการ clone repository นี้ลงบนเครื่องของคุณ:

```bash
git clone <your-repository-url>
cd toolsmith_restructured
```

### 2\. สร้างและเปิดใช้งาน Virtual Environment

เพื่อป้องกันปัญหาเรื่องเวอร์ชันของ Library ควรสร้างสภาพแวดล้อมเสมือน (Virtual Environment) ขึ้นมาใหม่:

```bash
# สำหรับ macOS/Linux
python3 -m venv venv
source venv/bin/activate

# สำหรับ Windows
python -m venv venv
.\venv\Scripts\activate
```

### 3\. ติดตั้ง Dependencies

ติดตั้ง Library ที่จำเป็นทั้งหมดจากไฟล์ `requirements.txt`:

```bash
pip install -r requirements.txt
```

### 4\. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์โดยคัดลอกเนื้อหาจากตัวอย่างด้านล่าง และกรอกข้อมูลของคุณลงไป:

```env
# .env
SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_KEY="YOUR_SUPABASE_ANON_KEY"
GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
```

  - `SUPABASE_URL` และ `SUPABASE_KEY`: สามารถหาได้จากหน้า Project Settings \> API ใน Dashboard ของ Supabase
  - `GOOGLE_API_KEY`: คือ API Key สำหรับใช้งาน Google Gemini

### 5\. ตั้งค่าฐานข้อมูล Supabase

ในโปรเจกต์ Supabase ของคุณ ให้สร้างตารางใหม่ชื่อ `tasks` โดยใช้ SQL Editor:

```sql
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  content_name text NULL,
  cases_size integer NULL,
  detail text NULL,
  generated_task_name text NULL,
  CONSTRAINT tasks_pkey PRIMARY KEY (id)
);
```

## ▶️ การรันแอปพลิเคชัน

หลังจากตั้งค่าทุกอย่างเสร็จสิ้น สามารถรันเซิร์ฟเวอร์ FastAPI ได้ด้วยคำสั่ง:

```bash
uvicorn app.main:app --reload
```

  - `--reload`: จะทำให้เซิร์ฟเวอร์รีสตาร์ทอัตโนมัติทุกครั้งที่มีการแก้ไขโค้ด

เมื่อรันสำเร็จ คุณจะเห็นข้อความว่าแอปพลิเคชันทำงานอยู่ที่ `http://127.0.0.1:8000`

## ใช้งาน API

คุณสามารถส่งคำขอเพื่อสร้างโจทย์ไปยัง Endpoint `/generate-task`

  - **URL**: `http://127.0.0.1:8000/generate-task`
  - **Method**: `POST`
  - **Body**: Raw JSON

**ตัวอย่าง Request Body:**

```json
{
  "content_name": "Depth First Search",
  "cases_size": 15,
  "detail": "The graph can be disconnected and may contain cycles."
}
```

### ตัวอย่างการใช้งานด้วย cURL

```bash
curl -X POST "http://127.0.0.1:8000/generate-task" \
-H "Content-Type: application/json" \
-d '{
  "content_name": "Depth First Search",
  "cases_size": 10,
  "detail": "The graph can be disconnected and may contain cycles."
}' \
--output generated_task.zip
```

หากการทำงานสำเร็จ ระบบจะตอบกลับเป็นไฟล์ **`generated_task.zip`** ซึ่งประกอบด้วยไฟล์โจทย์ทั้งหมด และจะมีการบันทึกข้อมูลการสร้างโจทย์ครั้งนี้ลงในตาราง `tasks` บน Supabase โดยอัตโนมัติ