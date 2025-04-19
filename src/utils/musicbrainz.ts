function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getOriginalYearFromMusicBrainz(trackName: string, artistName: string): Promise<string | null> {
    const query = `recording:"${trackName}" AND artist:"${artistName}"`;
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=5`;
  
    try {
      let attempts = 0;
      let response: Response | null = null;

      while (attempts < 3) {
        await delay(1100); // Rate-Limit: max. 1 Request pro Sekunde
        response = await fetch(url, {
          headers: {
            'User-Agent': 'tunequest-card-creator/1.0 (marvin@example.com)'
          }
        });

        if (response.status === 503) {
          console.warn(`[WARN] MusicBrainz API antwortet mit 503. Versuch ${attempts + 1}/3…`);
          await delay(3000); // warte 3 Sekunden und versuche erneut
          attempts++;
          continue;
        }

        break;
      }

      if (!response || !response.ok) {
        console.warn("[WARN] MusicBrainz API Fehler:", response?.status);
        return null;
      }

      const data = await response.json();

      const years = data.recordings
        .map((rec: any) => rec['first-release-date'])
        .filter((date: string) => !!date)
        .map((date: string) => date.slice(0, 4));

      return years.length > 0 ? years.sort()[0] : null; // ältestes Jahr
    } catch (e) {
      console.error("[ERROR] MusicBrainz Fehler:", e);
      return null;
    }
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