function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getOriginalYearFromMusicBrainz(trackName: string, artistName: string): Promise<string | null> {
  const query = `recording:"${trackName}" AND artist:"${artistName}"`;
  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=5`;

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      await delay(1200); // >1s Abstand wegen Rate Limit
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'tunequest-card-creator/1.0 (marvin@example.com)'
        }
      });

      if (response.status === 503) {
        console.warn(`[WARN] MusicBrainz API 503 für "${trackName}" (${artistName}) – Versuch ${attempts + 1}/${maxAttempts}`);
        attempts++;
        await delay(3000); // warte länger und versuche erneut
        continue;
      }

      if (!response.ok) {
        console.warn(`[WARN] MusicBrainz API Fehler ${response.status} für "${trackName}"`);
        return null;
      }

      const data = await response.json();
      const years = data.recordings
        .map((rec: { 'first-release-date'?: string }) => rec['first-release-date'])
        .filter((date: string) => !!date)
        .map((date: string) => date.slice(0, 4));

      return years.length > 0 ? years.sort()[0] : null;

    } catch (e) {
      console.error(`[ERROR] MusicBrainz Fehler bei "${trackName}" (${artistName}):`, e);
      attempts++;
      await delay(3000); // ebenfalls etwas warten
    }
  }

  console.warn(`[FAIL] MusicBrainz: Alle Versuche fehlgeschlagen für "${trackName}"`);
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