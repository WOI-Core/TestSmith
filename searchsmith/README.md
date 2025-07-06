### 📁 `README.md` (ไฟล์แนะนำการใช้งาน)

# Searchsmith

Searchsmith คือเครื่องมือค้นหาโจทย์ปัญหาโปรแกรมมิ่งอัจฉริยะที่ใช้เทคโนโลยี Hybrid-Semantic Search ผ่าน Supabase (PostgreSQL with pgvector) และจัดการ Workflow ด้วย LangGraph โดยมี Google Gemini เป็น LLM หลัก

## 🌟 Features

-   **Update Database API**: รับไฟล์ Markdown และ C++ solution เพื่อสร้างแท็กและ Vector Embedding จากนั้นบันทึกลง Supabase
-   **Query API**: รับคำค้นหาจากผู้ใช้เพื่อทำ Hybrid-Semantic Search และแนะนำโจทย์ที่เกี่ยวข้อง 5 อันดับแรก
-   **Modern Tech Stack**: FastAPI, Supabase, LangGraph, และ Google Gemini API

## 🚀 วิธีการติดตั้งและใช้งาน

### 1. การตั้งค่าเบื้องต้น (Prerequisites)

-   ติดตั้ง Python 3.9+
-   สร้างโปรเจคบน [Supabase](https://supabase.com/) และเปิดใช้งาน extension `pgvector`
-   สร้างตารางและฟังก์ชัน SQL ตามที่ระบุในส่วน "Supabase Setup"
-   รับ API Key จาก [Google AI Studio](https://aistudio.google.com/)

### 2. ติดตั้ง Dependencies

1.  Clone repository นี้:
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

### 3. ตั้งค่า Environment Variables


1.  สร้าง `.env` และใส่ค่าที่ถูกต้อง:
    ```
    GOOGLE_API_KEY="your_google_api_key"
    SUPABASE_URL="[https://your-project-ref.supabase.co](https://your-project-ref.supabase.co)"
    SUPABASE_KEY="your_supabase_anon_key"
    ```

### 4. การตั้งค่า Supabase (Supabase Setup)

เข้าไปที่ **SQL Editor** บน Dashboard ของ Supabase แล้วรันคำสั่งต่อไปนี้:

1.  **เปิดใช้งาน `pgvector` extension** (ถ้ายังไม่ได้ทำ):
    ```sql
    create extension if not exists vector;
    ```

2.  **สร้างตาราง `problems`**:
    ```sql
    create table problems (
        problem_id text primary key,
        markdown_content text,
        solution_code text,
        tags text[],
        created_at timestamptz default now(),
        embedding vector(768) -- ขนาด 768 สำหรับ text-embedding-004
    );
    ```

3.  **สร้างฟังก์ชันสำหรับ Hybrid Search**:
    ```sql
    create or replace function hybrid_search_problems(
        query_text text,
        query_embedding vector(768),
        match_count int
    )
    returns table (
        problem_id text,
        similarity float
    )
    as $$
    begin
        return query
        select
            p.problem_id,
            -- คำนวณคะแนนความคล้าย (1 - cosine distance)
            1 - (p.embedding <=> query_embedding) as similarity
        from
            problems p
        -- สามารถเพิ่มเงื่อนไข full-text search ที่นี่ได้
        -- where to_tsvector('english', p.markdown_content || ' ' || array_to_string(p.tags, ' ')) @@ to_tsquery('english', query_text)
        order by
            similarity desc
        limit
            match_count;
    end;
    $$ language plpgsql;
    ```

### 5. รัน API Server

ใช้ Uvicorn เพื่อรัน FastAPI server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```