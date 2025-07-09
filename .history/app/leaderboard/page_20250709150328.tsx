"use client";

import { useState, useEffect } from 'react';
import styles from './Leaderboard.module.css';

// Define the structure of a leaderboard entry
interface LeaderboardEntry {
  username: string;
  solved: number;
  points: number;
}

const LeaderboardPage = () => {
  // State to hold the leaderboard data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  // State to manage loading status
  const [isLoading, setIsLoading] = useState(true);
  // State to handle any errors during data fetching
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Function to fetch leaderboard data from your backend API
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data.');
        }

        const data = await response.json();
        // FIX: Ensure data is an array before setting state
        setLeaderboard(data || []);
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching leaderboard:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []); // The empty dependency array ensures this effect runs only once on mount

  if (isLoading) {
    return <div className={styles.container}><h2>Loading Leaderboard...</h2></div>;
  }

  if (error) {
    return <div className={styles.container}><h2>Error: {error}</h2></div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🏆 Leaderboard</h1>
      <table className={styles.leaderboardTable}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Problems Solved</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => (
            <tr key={index} className={styles.leaderboardRow}>
              <td>{index + 1}</td>
              <td>{entry.username}</td>
              <td>{entry.solved}</td>
              <td>{entry.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardPage;