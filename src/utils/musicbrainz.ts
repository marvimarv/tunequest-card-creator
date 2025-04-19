function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getOriginalYearFromMusicBrainz(trackName: string, artistName: string): Promise<string | null> {
  const query = `recording:"${trackName}" AND artist:"${artistName}"`;
  const url = `/api/musicbrainz/year?track=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}`;

  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 3000;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 503) {
        console.warn(`MusicBrainz 503 - retrying (${attempt + 1}/${MAX_RETRIES})`);
        await delay(RETRY_DELAY_MS);
        continue;
      }

      if (!response.ok) {
        console.warn(`[WARN] MusicBrainz API Fehler ${response.status} für "${trackName}"`);
        return null;
      }

      const data = await response.json();
      return data.year ?? null;

    } catch (e) {
      console.error(`[ERROR] MusicBrainz Fehler bei "${trackName}" (${artistName}):`, e);
      await delay(RETRY_DELAY_MS);
    }
  }

  return null;
}

export async function getOriginalYearBatch(
  tracks: { trackName: string; artistName: string }[]
): Promise<(string | null)[]> {
  const results: (string | null)[] = [];

  for (const track of tracks) {
    const year = await getOriginalYearFromMusicBrainz(track.trackName, track.artistName);
    results.push(year);
  }

  return results;
}