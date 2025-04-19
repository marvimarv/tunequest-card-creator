import { PlaylistedTrack, Scopes, SpotifyApi, Track } from "@spotify/web-api-ts-sdk";
import React, { Fragment, useRef, useState, useEffect } from "react";
import dayjs from 'dayjs'
import { pdf } from '@react-pdf/renderer';
import { Document, Image, Page as PDFPage, PDFViewer, Text, View } from "@react-pdf/renderer";
import * as QRCode from 'qrcode';
import { useSpotify } from "./hooks/useSpotify";
import { getOriginalYearFromMusicBrainz } from "./utils/musicbrainz";
import PDFContent from "./components/PDFContent";
const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string;
const playlistRegex = /^https:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9-]+).*$/gm


  const arrayChunks = (array: PlaylistedTrack<Track>[], chunkSize: number) => Array(Math.ceil(array.length / chunkSize))
    .fill(null)
    .map((_, index) => index * chunkSize)
    .map(begin => array.slice(begin, begin + chunkSize));

const generateSessionPDFQrCode = async (
    data: string,
): Promise<string> => {
    return QRCode.toDataURL(
        data,
        {
            errorCorrectionLevel: "H",
        },
    );
}

function App() {
    const [url, setUrl] = useState<string>('');
    const [playlistItems, setPlaylistItems] = useState<PlaylistedTrack<Track>[] | null>(null);
    const [name, setName] = useState<string>('');
    const [codeType, setCodeType] = useState('qr');
    // steuert, ob der MusicBrainz‑Abgleich aktiv ist
    const [useMusicBrainz, setUseMusicBrainz] = useState<boolean>(true);
    const inputRef = useRef<HTMLInputElement>(null);
    const sdk = useSpotify(clientId, redirectUri, [Scopes.playlistRead]);
    const [codes, setCodes] = useState<string[]>([]);
    const [logMessages, setLogMessages] = useState<string[]>([]);
    const logBoxRef = useRef<HTMLDivElement>(null);

const log = (level: "info" | "warn" | "error", ...args: any[]) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] [${level.toUpperCase()}] ${args
    .map((a) => (typeof a === "object" ? JSON.stringify(a) : a))
    .join(" ")}`;
  console[level](message);
  setLogMessages((prev) => [...prev, message]);
};

useEffect(() => {
  if (logBoxRef.current) {
    logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
  }
}, [logMessages]);

const generateCodes = async (items: PlaylistedTrack<Track>[]) => {
    const generated = await Promise.all(
      items.map(async (it) =>
        codeType === "qr"
          ? await generateSessionPDFQrCode(`spotify:track:${it.track.id}`)
          : `https://scannables.scdn.co/uri/plain/jpeg/FFFFFF/black/320/spotify:track:${it.track.id}`
      )
    );
    setCodes(generated);
  };

const getOriginalYear = async (trackId: string, fallback: string, trackName: string, artistName: string): Promise<string> => {
        if (!sdk) {
        log("warn", "SDK noch nicht initialisiert für", trackId);
            return fallback.slice(0, 4);
        }
        try {
            const track = await sdk.tracks.get(trackId, "DE");
            await new Promise(res => setTimeout(res, 100)); // Rate-Limit-Pause
 
            const realYear = track.album.release_date.slice(0, 4);
            const fallbackYear = fallback.slice(0, 4);
 
            log("info", `Spotify-Jahr für "${trackName}" (${trackId}): ${realYear}, Fallback: ${fallbackYear}`);
 
            // Standard‑Vergleich Spotify vs. Fallback
            let earliestYear = realYear < fallbackYear ? realYear : fallbackYear;

            // ▶ MusicBrainz nur, wenn Checkbox aktiv
            if (useMusicBrainz) {
                const mbYear = await getOriginalYearFromMusicBrainz(trackName, artistName);
                if (mbYear) {
                    earliestYear = [mbYear, earliestYear].sort()[0];
                    log("info", `MusicBrainz override für "${trackName}" (${trackId}): ${earliestYear}`);
                }
            } else {
                log("info", `MusicBrainz‑Check deaktiviert – nutze Spotify/Fallback für "${trackName}"`);
            }

            return earliestYear;
        } catch (e) {
            log("error", "getOriginalYear fehlgeschlagen für", trackId, e);
            log("info", `Using fallback release year for ${trackId}: ${fallback.slice(0, 4)}`);
            return fallback.slice(0, 4);
        }
    };
    
    const getPlaylist = async () => {
        const match = playlistRegex.exec(url);
        if (!match) {
          console.log("[DEBUG] Keine gültige Playlist‑URL");
          return;
        }
      
        const playlistId = match[1];
        console.log("[DEBUG] Playlist‑ID:", playlistId);
      
        const items: PlaylistedTrack<Track>[] = [];
        const limit = 50;
        let result = null;
        let offset = 0;
      
        do {
          result = await sdk.playlists.getPlaylistItems(
            playlistId,
            "DE",
            "offset,limit,next,items(track(id,name,artists(name),album(release_date)))",
            limit,
            offset
          );
      
          console.log("[DEBUG] Batch erhalten:", {
            offset,
            received: result.items.length,
            next: result.next,
          });
      
          const filteredItems = result.items.filter(item => item.track?.name);
          for (const it of filteredItems) {
          const cleanedName = it.track.name
              .replace(/ *[-–—:]? *(?:Remaster(?:ed)?|Re[- ]?master(?:ed)?(?: Version)?)(?: \d{4})?/gi, "")
              .replace(/ *[-–—:]? *Version(?: \d{4})?/gi, "")
              .replace(/ *[-–—:]? *Stereo/gi, "")
              .replace(/\(.*?\)/g, "")
              .replace(/\[.*?\]/g, "")
              .replace(/\s+/g, " ")
              .trim();
            const artistName = it.track.artists[0]?.name ?? '';
            const origYear = await getOriginalYear(it.track.id, it.track.album.release_date, cleanedName, artistName);
            it.track.name = cleanedName;
            it.track.album.release_date = origYear;
          }
          items.push(...filteredItems);
      
          offset += result.limit;
        } while (result.next !== null);
      
        console.log("[DEBUG] Gesamtanzahl gefilterter Items:", items.length);
        setPlaylistItems(items);
        generateCodes(items);
      };

  const setCardName = () => {
      setName(inputRef.current?.value ?? '');
  }

  const handleDownload = async () => {
      if (!playlistItems) return;

      // 1️⃣  Vorab alle Codes generieren
      const codes = await Promise.all(
        playlistItems.map(async (it) => {
          const uri = codeType === "qr"
            ? `spotify:track:${it.track.id}`
            : `https://scannables.scdn.co/uri/plain/jpeg/FFFFFF/black/320/spotify:track:${it.track.id}`;

          // QR‑Code generieren oder direkten Spotify‑Code zurückgeben
          if (codeType === "qr") {
            return await generateSessionPDFQrCode(uri);
          }
          return uri; // Spotify‑Code ist bereits eine URL
        })
      );

      // 2️⃣  PDF zusammenbauen
     const blob = await pdf(
  <PDFContent
    playlistItems={playlistItems}
    name={name}
    codeType={codeType}
    codes={codes}
  />
).toBlob();

      // 3️⃣  Download auslösen
      const urlBlob = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = 'playlist-cards.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(urlBlob);
    };

    return (
        <div className="w-full h-screen overflow-scroll">

            <div className="mx-auto mt-16 w-full mt-8 px-8">

                <div
                    className="pointer-events-auto flex items-center justify-between gap-x-6 bg-blue-50 px-6 py-2.5 sm:rounded-xl sm:py-3 sm:pl-4 sm:pr-3.5 mb-4 sm:mb-8">
                    <div className="text-sm leading-6 text-blue-700 flex space-x-2">
                        <div className="text-blue-400">
                            <strong className="font-semibold">Important</strong>
                            <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true">
                                <circle cx={1} cy={1} r={1}/>
                            </svg>
                            <span>
                                This tool uses the Spotify API to read the release year of the tracks by looking at the tracks album release year.
When creating your playlist you need to pay attention to select the original tracks and not the remastered versions or version of the tracks that are part of some compilations since this results in wrong release year information.
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-5">

                    <div className="col-span-1 sm:col-span-4">
                        <label htmlFor="playlist" className="block text-sm font-semibold leading-6 text-gray-900">
                            Playlist URL
                        </label>
                        <div className="mt-2.5">
                            <input
                                type="text"
                                id="playlist"
                                value={url}
                                placeholder="https://open.spotify.com/playlist/A1B2C3D4E5F6G7H8I9"
                                onChange={e => setUrl(e.target.value)}
                                className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={getPlaylist}
                            className="block w-full rounded-md bg-indigo-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            Load Playlist Data
                        </button>

                    </div>
                </div>

                <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-5 mt-4">
                    <div className="col-span-1 sm:col-span-4">
                        <label htmlFor="name" className="block text-sm font-semibold leading-6 text-gray-900">
                            Name (optional, will be printed on the cards)
                        </label>
                        <div className="mt-2.5">
                            <input
                                type="text"
                                id="name"
                                ref={inputRef}
                                className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => setCardName()}
                            className="block w-full rounded-md bg-indigo-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            Set Name
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-8 mt-4">

                  <div className="col-span-1 sm:col-span-1">
                      <label htmlFor="codeType" className="block text-sm font-semibold leading-6 text-gray-900">
                          Select Code Type
                      </label>
                      <div className="mt-2.5">
                      <select
  id="codeType"
  name="codeType"
  value={codeType}
  onChange={e => setCodeType(e.target.value)}
  className="…"
>
  <option value="qr">QR Code</option>
  <option value="spotify">Spotify Code</option>
</select>
                      </div>
                  </div>

                  <div className="col-span-1 sm:col-span-2 flex items-center">
                    <input
                      id="useMusicBrainz"
                      type="checkbox"
                      className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      checked={useMusicBrainz}
                      onChange={() => setUseMusicBrainz(!useMusicBrainz)}
                    />
                    <label htmlFor="useMusicBrainz" className="text-sm font-semibold leading-6 text-gray-900">
                      MusicBrainz‑Check
                    </label>
                  </div>
                </div>
                {logMessages.length > 0 && (
                        <div
                          ref={logBoxRef}
                          className="mx-auto mt-6 w-3/4 bg-gray-100 rounded-md p-4 shadow-inner max-h-60 overflow-y-auto">
                          {logMessages.map((msg, idx) => (
                            <p key={idx} className="text-xs font-mono whitespace-pre-line">
                              {msg}
                            </p>
                          ))}
                        </div>
                      )}
            </div>

            {
                playlistItems && (
                    <>

                      <div className="flex justify-center mt-6">
                        <button
                          onClick={handleDownload}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
                        >
                          Download PDF
                        </button>
                      </div>
                      <PDFViewer className="w-3/4 h-3/4 mx-auto mt-8">
  <PDFContent
    playlistItems={playlistItems}
    name={name}
    codeType={codeType}
    codes={codes}
  />
</PDFViewer>
                    </>
                )}
        </div>
    )
}

export default App;
