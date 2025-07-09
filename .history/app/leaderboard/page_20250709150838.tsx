"use client";

import React, { useState, useEffect } from 'react';

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

useEffect(() => {
    fetch('/api/progress/leaderboard')
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
        })
        .then(apiResponse => {
            // Check if the response was successful and the data exists
            if (apiResponse.success && apiResponse.data && Array.isArray(apiResponse.data.leaderboard)) {
                // Set the state with the nested leaderboard array
                setLeaderboard(apiResponse.data.leaderboard);
            } else {
                // If the structure is wrong, log an error and set an empty array
                console.error("Unexpected API response structure:", apiResponse);
                setLeaderboard([]);
            }
        })
        .catch(error => {
            console.error("Failed to load leaderboard:", error);
            // Ensure leaderboard is an empty array on error
            setLeaderboard([]); 
        })
        .finally(() => {
            setLoading(false);
        });
}, []);

    if (loading) {
        return <p className="p-8 text-center">Loading leaderboard...</p>;
    }

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-center">🏆 Leaderboard</h2>
            <div className="bg-card-bg rounded-lg shadow-md overflow-x-auto max-w-4xl mx-auto">
                <table className="w-full min-w-[600px]">
                    <thead className="bg-header-bg">
                        <tr>
                            <th className="p-4 text-left font-semibold">Rank</th>
                            <th className="p-4 text-left font-semibold">Username</th>
                            <th className="p-4 text-left font-semibold">Problems Solved</th>
                            <th className="p-4 text-left font-semibold">Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.length > 0 ? leaderboard.map((user, index) => (
                            <tr key={user.username} className="border-b border-border-color last:border-b-0 hover:bg-input-bg transition-colors">
                                <td className="p-4 font-bold text-lg">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                </td>
                                <td className="p-4 font-semibold">{user.username}</td>
                                <td className="p-4">{user.solved}</td>
                                <td className="p-4 text-accent-color font-bold">{user.points}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-text-secondary">The leaderboard is empty.</td>
                           </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
