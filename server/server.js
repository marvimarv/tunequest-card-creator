import express from 'express';
import cors from 'cors';
import musicbrainzProxy from './musicbrainz-proxy.js';

const app = express();
const port = 3005;

app.use(cors());
app.use('/musicbrainz', musicbrainzProxy);

app.listen(port, () => {
  console.log(`MusicBrainz proxy server running on port ${port}`);
});