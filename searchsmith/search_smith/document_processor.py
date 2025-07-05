# search_smith/document_processor.py
import os
import json
from pathlib import Path
from langchain_core.runnables import Runnable
from tqdm import tqdm

def create_langchain_json(
    solutions_dir: Path,
    output_path: Path,
    chain: Runnable,
    file_limit: int = None
):
    """
    ประมวลผลไฟล์เฉลย, สร้างแท็กโดยใช้ LangChain chain,
    และสร้างไฟล์ JSON รูปแบบ LangChain Document
    โดยจะใช้เนื้อหาของโค้ดเฉลยในการสร้างแท็กเท่านั้น

    ส่วน 'page_content' ของแต่ละ document จะมีเพียงแท็กที่สร้างขึ้น
    เพื่อใช้สำหรับกระบวนการ embedding ต่อไป

    Args:
        solutions_dir (Path): ไดเรกทอรีที่มีไฟล์เฉลย .txt
        output_path (Path): ตำแหน่งสำหรับบันทึกไฟล์ JSON
        chain (Runnable): LangChain (LCEL) chain ที่จะใช้สำหรับสร้างแท็ก
        file_limit (int, optional): จำนวนไฟล์สูงสุดที่จะประมวลผล (ถ้าไม่ระบุคือทั้งหมด)
    """
    print(f"\n🔎 กำลังประมวลผลไฟล์เฉลยใน '{solutions_dir}'...")
    if not solutions_dir.is_dir():
        print(f"⚠️ เกิดข้อผิดพลาด: ไม่พบไดเรกทอรี '{solutions_dir}'")
        return

    # ดึงรายการไฟล์เฉลย .txt ทั้งหมด
    files_to_process = sorted([f for f in os.listdir(solutions_dir) if f.endswith(".txt")])

    if file_limit is not None:
        print(f"ℹ️  จำกัดการประมวลผลที่ {file_limit} ไฟล์")
        files_to_process = files_to_process[:file_limit]

    all_documents = []
    # ใช้ tqdm เพื่อแสดงแถบความคืบหน้า
    for filename in tqdm(files_to_process, desc="กำลังประมวลผลไฟล์เฉลย"):
        problem_id = Path(filename).stem
        solution_file_path = solutions_dir / filename

        try:
            # 1. โหลดเนื้อหาโค้ดจากไฟล์ .txt
            solution_code = ""
            if solution_file_path.exists():
                with open(solution_file_path, 'r', encoding='utf-8') as f:
                    solution_code = f.read()
            else:
                # กรณีนี้ไม่ควรเกิดขึ้น แต่เป็นการป้องกันข้อผิดพลาด
                tqdm.write(f"    ⚠️ ไม่พบไฟล์เฉลย '{filename}' ที่ '{solution_file_path}'. กำลังข้ามไฟล์นี้")
                continue

            if not solution_code.strip():
                tqdm.write(f"    ⚠️ ไฟล์เฉลย '{filename}' ไม่มีเนื้อหา. กำลังข้ามไฟล์นี้")
                continue

            # 2. เรียกใช้ chain เพื่อสร้างแท็กจากโค้ดเฉลย
            # เราจะส่ง solution_code ไปยังตัวแปร 'question_markdown' ตามที่ prompt คาดหวัง
            raw_tags = chain.invoke({"question_markdown": solution_code})

            # แยกแท็กที่คั่นด้วยจุลภาค (comma) ให้อยู่ในรูปแบบ list
            tag_list = [tag.strip() for tag in raw_tags.strip().split(',') if tag.strip()]
            tags_as_string = ", ".join(tag_list)

            # 3. สร้าง document object
            # 'page_content' จะเป็นแท็กเท่านั้น เพื่อใช้ในการทำ embedding
            # ส่วนโค้ดเฉลยจะถูกเก็บไว้ใน metadata
            document_data = {
                "page_content": tags_as_string,
                "metadata": {
                    "problem_id": problem_id,
                    "problem_name": problem_id,
                    "source": ''.join(filter(str.isalpha, problem_id.split('_')[0])).upper(),
                    "tags": tag_list,
                    "solution_code": solution_code
                }
            }
            all_documents.append(document_data)

        except Exception as e:
            tqdm.write(f"    ❌ เกิดข้อผิดพลาดในการประมวลผลไฟล์ {filename}: {e}")

    # 4. บันทึกข้อมูลทั้งหมดลงในไฟล์ JSON
    try:
        # ตรวจสอบให้แน่ใจว่าไดเรกทอรีสำหรับ output มีอยู่จริง
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(all_documents, f, indent=4, ensure_ascii=False)
        print(f"\n📄 สร้างไฟล์ JSON สำเร็จที่ '{output_path}'")
    except Exception as e:
        print(f"\n    ❌ เกิดข้อผิดพลาดในการบันทึกไฟล์ JSON: {e}")

    print("\n✨ การประมวลผลเอกสารเสร็จสมบูรณ์")
