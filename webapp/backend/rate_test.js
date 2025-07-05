import fetch from 'node-fetch';

const GITHUB_TOKEN = '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';

async function checkRateLimit() {
  try {
    const res = await fetch('https://api.github.com/rate_limit', {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'rate-tester'
      }
    });
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}

checkRateLimit();