/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Rule ที่ 1: ชี้ request สำหรับการค้นหาไปยัง searchsmith service ที่ถูกต้อง
      {
        source: "/api/problems/search",
        destination: "http://127.0.0.1:8001/v1/query", // แก้ไข port เป็น 8000 และ path เป็น /v1/query
      },
      // Rule ที่ 2: สำหรับ toolsmith service (ถ้ามี)
      {
        source: "/api/tools/:path*",
        destination: "http://127.0.0.1:8000/:path*",
      },
      // Rule ที่ 3: Rule ทั่วไปสำหรับ API อื่นๆ ให้ชี้ไปที่ Backend หลัก
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
