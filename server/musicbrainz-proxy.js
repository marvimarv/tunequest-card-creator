import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/year', async (req, res) => {
  const { track, artist } = req.query;

  if (!track || !artist) {
    return res.status(400).json({ error: 'Missing track or artist query parameter.' });
  }

  const query = `recording:"${track}" AND artist:"${artist}"`;
  const encodedQuery = encodeURIComponent(query);
  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodedQuery}&fmt=json&limit=5`;

  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 3000;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'tunequest-card-creator/1.0.0 ( marvin@marvoproduction-apps.de )'
        }
      });

      if (response.status === 503) {
        console.warn(`MusicBrainz 503 - retrying (${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }

      if (!response.ok) {
        return res.status(response.status).send(`MusicBrainz API error: ${response.statusText}`);
      }

      const data = await response.json();

      const first = data.recordings?.[0];
      const year = first?.['first-release-date']?.slice(0, 4) ?? null;
      return res.json({ year });
    } catch (err) {
      console.warn(`MusicBrainz request failed (attempt ${attempt + 1}): ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  res.status(500).json({ error: 'Failed to fetch from MusicBrainz after multiple retries.' });
});

export default router;