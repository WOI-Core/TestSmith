const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const NUM_USERS = 100;
const REQUESTS_PER_USER = 10;

async function runLoadTest() {
  console.log(`Starting load test with ${NUM_USERS} users, ${REQUESTS_PER_USER} requests per user...`);

  const promises = [];

  for (let i = 0; i < NUM_USERS; i++) {
    promises.push(runUserSimulation(i));
  }

  await Promise.all(promises);

  console.log('Load test finished.');
}

async function runUserSimulation(userId) {
  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    try {
      // Simulate a search request
      await axios.post(`${API_URL}/problems/search`, {
        query: 'test',
      });

      // Simulate a submission request
      await axios.post(`${API_URL}/submissions/submit`, {
        problemId: 'test-problem',
        language: 'Python',
        sourceCode: 'print("hello world")',
        userId: `user-${userId}`,
      });
    } catch (error) {
      console.error(`Error for user ${userId}:`, error.message);
    }
  }
}

runLoadTest(); 