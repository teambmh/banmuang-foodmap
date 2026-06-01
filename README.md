# บ้านม่วง FoodMap แบบ Google Sheet

ระบบนี้ไม่ใช้ Overpass API แล้ว แต่ใช้ Google Sheet เป็นฐานข้อมูลร้านแทน

## 1) สร้าง Google Sheet

ตั้งชื่อชีตว่า `places` แล้วสร้างหัวคอลัมน์แถวแรกตามนี้:

```text
name,category,lat,lng,phone,open,menu,detail,image,map_url
```

ตัวอย่าง:

```text
ร้านก๋วยเตี๋ยวบ้านม่วง,ร้านอาหาร,17.85167,103.57000,08x-xxx-xxxx,08.00-16.00 น.,ก๋วยเตี๋ยว,ร้านแนะนำในบ้านม่วง,, 
```

## 2) ให้ทุกคนแก้ไขได้

กด Share ใน Google Sheet แล้วตั้งค่าเป็น:

```text
Anyone with the link
Editor
```

หรือจำกัดเฉพาะคนในทีมก็ได้

## 3) Publish เป็น CSV

ไปที่:

```text
File > Share > Publish to web
```

เลือก:
- Sheet: places
- Format: Comma-separated values (.csv)

Copy ลิงก์ CSV ที่ได้

## 4) ตั้งค่าในเว็บ

เปิดไฟล์:

```text
js/app.js
```

แก้ 2 บรรทัดนี้:

```javascript
const SHEET_CSV_URL = "";
const SHEET_EDIT_URL = "";
```

เป็น:

```javascript
const SHEET_CSV_URL = "ลิงก์ CSV จาก Publish to web";
const SHEET_EDIT_URL = "ลิงก์ Google Sheet สำหรับแก้ไข";
```

จากนั้นอัปโหลดทับขึ้น GitHub แล้ว Commit

## หมวดหมู่ที่แนะนำ

- ร้านอาหาร
- คาเฟ่
- ร้านกาแฟ
- หมูกระทะ
- ของหวาน
- ร้านค้า

## วิธีหาพิกัดร้าน

เปิด Google Maps > คลิกขวาที่ตำแหน่งร้าน > Copy พิกัด เช่น:

```text
17.85167, 103.57000
```

เอาเลขตัวแรกใส่ `lat` และเลขตัวที่สองใส่ `lng`
