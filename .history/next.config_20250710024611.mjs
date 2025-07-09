// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/problems/:path*',
                destination: 'http://localhost:3001/api/problems/:path*',
            },
            {
                source: '/api/submissions/:path*',
                destination: 'http://localhost:3001/api/submissions/:path*',
            },
            {
                source: '/api/auth/:path*',
                destination: 'http://localhost:3001/api/auth/:path*',
            },
            {
                source: '/api/problems/search', // Specific route for SearchSmith search
                destination: 'http://localhost:8001/v1/search', // Changed port to 8001
            },
        ];
    },
};

export default nextConfig;