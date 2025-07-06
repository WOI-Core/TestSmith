# Searchsmith (Refactored)

Searchsmith คือเครื่องมือค้นหาโจทย์ปัญหาโปรแกรมมิ่งอัจฉริยะที่ใช้เทคโนโลยี Hybrid-Semantic Search ผ่าน Supabase (PostgreSQL with pgvector) และจัดการ Workflow ด้วย LangGraph โดยมี Google Gemini เป็น LLM หลัก

## 🌟 Features

  - **Language Agnostic**: รองรับ Solution Code จากภาษาโปรแกรมมิ่งใดก็ได้
  - **Update Database API**: รับเนื้อหาของโจทย์ (Markdown) และโค้ดเฉลย ในรูปแบบ string เพื่อสร้างแท็กและ Vector Embedding จากนั้นบันทึกลง Supabase
  - **Query API**: รับคำค้นหาจากผู้ใช้เพื่อทำ Hybrid-Semantic Search และแนะนำโจทย์ที่เกี่ยวข้อง 5 อันดับแรก
  - **Modern Tech Stack**: FastAPI, Supabase, LangGraph, และ Google Gemini API

-----

## 🚀 วิธีการติดตั้งและใช้งาน

### 1\. การตั้งค่าเบื้องต้น (Prerequisites)

  - ติดตั้ง Python 3.9+
  - สร้างโปรเจคบน [Supabase](https://supabase.com/) และเปิดใช้งาน extension `pgvector`
  - สร้างตารางและฟังก์ชัน SQL ตามที่ระบุในส่วน "Supabase Setup"
  - รับ API Key จาก [Google AI Studio](https://aistudio.google.com/)

### 2\. ติดตั้ง Dependencies

1.  Clone a repository này:

    ```bash
    git clone <your-repo-url>
    cd searchsmith
    ```

2.  สร้างและเปิดใช้งาน virtual environment:

    ```bash
    python -m venv venv
    source venv/bin/activate  # บน Windows ใช้ `venv\Scripts\activate`
    ```

3.  ติดตั้ง packages ที่จำเป็น:

    ```bash
    pip install -r requirements.txt
    ```

-----

### 3\. ตั้งค่า Environment Variables

1.  คัดลอกไฟล์ `.env.example` ไปเป็น `.env`:

    ```bash
    cp .env.example .env
    ```

2.  แก้ไขไฟล์ `.env` และใส่ค่าที่ถูกต้อง:

    ```
    GOOGLE_API_KEY="your_google_api_key"
    SUPABASE_URL="https://your-project-ref.supabase.co"
    SUPABASE_KEY="your_supabase_anon_key"
    ```

-----

### 4\. การตั้งค่า Supabase (Supabase Setup)

เข้าไปที่ **SQL Editor** บน Dashboard ของ Supabase แล้วรันคำสั่งต่อไปนี้:

1.  **เปิดใช้งาน `pgvector` extension**:

    ```sql
    create extension if not exists vector;
    ```

2.  **สร้างตาราง `problems`**:

    ```sql
    -- ตรวจสอบและลบตารางเก่าก่อน เพื่อความแน่นอน
    drop table if exists problems;

    create table problems (
        problem_id text primary key,
        problem_name text not null,
        markdown_content text,
        solution_code text, -- คอลัมน์นี้เป็น text ทั่วไป
        tags text[],
        created_at timestamptz default now(),
        embedding vector(768)
    );
    ```

3.  **สร้างฟังก์ชันสำหรับ Hybrid Search**:

    ```sql
    -- ตรวจสอบและลบฟังก์ชันเก่าก่อน
    drop function if exists hybrid_search_problems;

    create or replace function hybrid_search_problems(
        query_text text,
        query_embedding vector(768),
        match_count int
    )
    returns table (
        problem_name text,
        similarity float
    )
    as $$
    begin
        return query
        select
            p.problem_name,
            1 - (p.embedding <=> query_embedding) as similarity
        from
            problems p
        order by
            similarity desc
        limit
            match_count;
    end;
    $$ language plpgsql;
    ```

-----

### 5\. รัน API Server

ใช้ Uvicorn เพื่อรัน FastAPI server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

-----

### 6\. การใช้งาน API

ตอนนี้ API ของคุณพร้อมใช้งานแล้วที่ `http://localhost:8000`

  - **ดูเอกสาร API อัตโนมัติ**: เข้าไปที่ `http://localhost:8000/docs` เพื่อทดลองใช้งานได้ง่ายขึ้น

#### ตัวอย่าง: การ Update Database (ใช้โค้ด Python)

ใช้ `curl` ส่ง JSON payload ที่มี `problem_name` และโค้ดภาษา Python ไปยัง endpoint `/v1/update-database`

```bash
curl -X POST "http://localhost:8000/v1/update-database" \
-H "Content-Type: application/json" \
-d '{
  "problem_name": "Find Palindrome",
  "markdown_content": "# Problem: Palindrome Check\n\nWrite a function that checks if a given string is a palindrome. A palindrome is a word, phrase, or sequence that reads the same backward as forward, e.g., madam or level.",
  "solution_code": "def is_palindrome(s):\n    # Clean the string by removing non-alphanumeric characters and converting to lowercase\n    cleaned_s = ''''.join(filter(str.isalnum, s)).lower()\n    # Check if the cleaned string is equal to its reverse\n    return cleaned_s == cleaned_s[::-1]"
}'
```

#### ตัวอย่าง: การ Query

ส่งคำค้นหาไปยัง endpoint `/v1/query`:

```bash
curl -X POST "http://localhost:8000/v1/query" \
-H "Content-Type: application/json" \
-d '{
  "query": "โจทย์เกี่ยวกับ string palindrome"
}'
```

**ผลลัพธ์ที่คาดหวัง:**

```json
{
  "recommended_problems": [
    "Find Palindrome",
    "Two Sum",
    "Another Problem Name"
  ]
}
```