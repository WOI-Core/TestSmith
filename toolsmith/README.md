# Toolsmith - AI-Powered Task Generator

**Toolsmith** คือโปรเจกต์สำหรับสร้างชุดโจทย์ปัญหา Competitive Programming โดยอัตโนมัติ โดยใช้สถาปัตยกรรมสมัยใหม่ที่ประกอบด้วย FastAPI, LangGraph, และ Google Gemini API สำหรับการสร้างเนื้อหา และใช้ Supabase เป็นฐานข้อมูลในการจัดเก็บบันทึกและไฟล์โจทย์ทั้งหมดอย่างเป็นระบบ

โปรเจกต์นี้ถูกออกแบบมาให้ง่ายต่อการพัฒนาและขยายความสามารถในอนาคต โดยแยกส่วนของ Logic หลักออกจากส่วนของ API อย่างชัดเจน

## ✨ Core Technologies

  * **Backend**: FastAPI
  * **LLM Orchestration**: LangGraph
  * **LLM Model**: Google Gemini API
  * **Database**: Supabase (PostgreSQL)
  * **Configuration**: Pydantic Settings

## 📂 Project Structure

โปรเจกต์นี้แบ่งโครงสร้างออกเป็น 2 ส่วนหลักเพื่อความเป็นระเบียบ:

  * **/app**: ทำหน้าที่เป็น API Layer รับและตอบสนอง HTTP requests โดยตรง
  * **/core**: เป็นแกนหลักของแอปพลิเคชัน ประกอบด้วย Business Logic, Services, การเชื่อมต่อฐานข้อมูล, และการจัดการ Graph ทั้งหมด
  * **/static**: โฟลเดอร์สำหรับเก็บไฟล์คงที่ เช่น `favicon.ico`

## 🚀 การติดตั้งและเริ่มใช้งาน (Setup and Installation)

ทำตามขั้นตอนต่อไปนี้เพื่อติดตั้งและรันโปรเจกต์บนเครื่องของคุณ

### 1\. Clone a Project

เริ่มต้นด้วยการ clone repository นี้ลงบนเครื่องของคุณ:

```bash
git clone <your-repository-url>
cd your_project_directory
```

### 2\. สร้างโฟลเดอร์ `static`

ที่ root ของโปรเจกต์ ให้สร้างโฟลเดอร์ใหม่ขึ้นมาชื่อว่า `static` และนำไฟล์ไอคอน (เช่น `favicon.ico`) ไปใส่ไว้ข้างใน

```bash
mkdir static
# (Optional) cp path/to/your/favicon.ico static/
```

### 3\. สร้างและเปิดใช้งาน Virtual Environment

เพื่อป้องกันปัญหาเรื่องเวอร์ชันของ Library ควรสร้างสภาพแวดล้อมเสมือน (Virtual Environment) ขึ้นมาใหม่:

```bash
# สำหรับ macOS/Linux
python3 -m venv venv
source venv/bin/activate

# สำหรับ Windows
python -m venv venv
.\venv\Scripts\activate
```

### 4\. ติดตั้ง Dependencies

ติดตั้ง Library ที่จำเป็นทั้งหมดจากไฟล์ `requirements.txt`:

```bash
pip install -r requirements.txt
```

### 5\. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์โดยคัดลอกเนื้อหาจากตัวอย่างด้านล่าง และกรอกข้อมูลของคุณลงไป:

```env
# .env
SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_KEY="YOUR_SUPABASE_ANON_KEY"
GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
```

  * `SUPABASE_URL` และ `SUPABASE_KEY`: สามารถหาได้จากหน้า Project Settings \> API ใน Dashboard ของ Supabase
  * `GOOGLE_API_KEY`: คือ API Key สำหรับใช้งาน Google Gemini

### 6\. ตั้งค่าฐานข้อมูล Supabase

ในโปรเจกต์ Supabase ของคุณ ให้ไปที่ **SQL Editor** แล้วรันคำสั่ง SQL ต่อไปนี้เพื่อสร้างและตั้งค่าตาราง `tasks` และ `task_files` ให้ถูกต้อง

**คำเตือน:** สคริปต์นี้จะลบตาราง `tasks` และ `task_files` ที่มีอยู่ออกไปก่อน แล้วจึงสร้างขึ้นมาใหม่ทั้งหมด

```sql
-- ลบตารางเก่าทิ้งหากมีอยู่แล้ว (ต้องลบตารางที่อ้างอิง foreign key ก่อน)
DROP TABLE IF EXISTS public.task_files;
DROP TABLE IF EXISTS public.tasks;

-- 1. สร้างตารางสำหรับเก็บข้อมูลหลักของโจทย์ (Tasks)
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  topic text NULL,
  description text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

-- 2. สร้างตารางสำหรับเก็บไฟล์แต่ละไฟล์ที่อยู่ในโจทย์ (Task Files)
CREATE TABLE public.task_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  category text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_content text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_files_pkey PRIMARY KEY (id),
  CONSTRAINT task_files_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 3. ตั้งค่า Policy เพื่อให้สามารถเข้าถึงตารางได้ผ่าน API Key (Anon Key)
CREATE POLICY "Enable all access for anon users on tasks"
ON public.tasks FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for anon users on task_files"
ON public.task_files FOR ALL
USING (true) WITH CHECK (true);
```

## ▶️ การรันแอปพลิเคชัน

หลังจากตั้งค่าทุกอย่างเสร็จสิ้น สามารถรันเซิร์ฟเวอร์ FastAPI ได้ด้วยคำสั่ง:

```bash
uvicorn app.main:app --reload
```

  * `--reload`: จะทำให้เซิร์ฟเวอร์รีสตาร์ทอัตโนมัติทุกครั้งที่มีการแก้ไขโค้ด

เมื่อรันสำเร็จ คุณจะเห็นข้อความว่าแอปพลิเคชันทำงานอยู่ที่ `http://127.0.0.1:8000`

## 💻 ใช้งานโปรแกรม

1.  **เปิดไฟล์ `index.html`** ในโฟลเดอร์ frontend ของคุณด้วย Web Browser
2.  กรอกรายละเอียดโจทย์ที่ต้องการ แล้วกดปุ่ม **"Generate Problem"**
3.  ระบบจะเรียกใช้ AI เพื่อสร้างไฟล์ทั้งหมดและแสดงตัวอย่างไฟล์ในหน้าเว็บ
4.  ตรวจสอบความถูกต้องของไฟล์ต่างๆ ผ่าน Dropdown และช่องแสดงผล
5.  เมื่อพอใจกับผลลัพธ์แล้ว กดปุ่ม **"Approve and Upload to Database"** เพื่อบันทึกข้อมูลโจทย์และไฟล์ทั้งหมดลงในฐานข้อมูล Supabase อย่างเป็นระบบ
6.  สามารถกด **"Download ZIP"** เพื่อดาวน์โหลดไฟล์ทั้งหมดในรูปแบบไฟล์ ZIP ได้ตลอดเวลาหลังจากการ Generate สำเร็จ