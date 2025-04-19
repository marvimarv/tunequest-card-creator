import { PlaylistedTrack, Scopes, SpotifyApi, Track } from "@spotify/web-api-ts-sdk";
import React, { Fragment, useRef, useState } from "react";
import dayjs from 'dayjs'
import { pdf } from '@react-pdf/renderer';
import { Document, Image, Page as PDFPage, PDFViewer, Text, View } from "@react-pdf/renderer";
import * as QRCode from 'qrcode';
import { useSpotify } from "./hooks/useSpotify";
import { getOriginalYearFromMusicBrainz } from "./utils/musicbrainz";

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
    const inputRef = useRef<HTMLInputElement>(null);
    const sdk = useSpotify(clientId, redirectUri, [Scopes.playlistRead]);

const log = (level: "info" | "warn" | "error", ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [${level.toUpperCase()}] ${args.map(a => typeof a === "object" ? JSON.stringify(a) : a).join(" ")}`;
    console[level](message);
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
 
            const mbYear = await getOriginalYearFromMusicBrainz(trackName, artistName);
            if (mbYear) {
                const earliest = [mbYear, realYear, fallbackYear].sort()[0];
                log("info", `Adjusted release year for "${trackName}" (${trackId}): ${fallbackYear} → ${earliest}`);
                return earliest;
            }
 
            return realYear < fallbackYear ? realYear : fallbackYear;
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
              .replace(/ *- *Remaster(ed)?( *\d{4})?/gi, "")
              .replace(/ *- *Version( *\d{4})?/gi, "")
              .replace(/ *- *Stereo/gi, "")
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
      };

  const setCardName = () => {
      setName(inputRef.current?.value ?? '');
  }

  const handleDownload = async () => {
      if (!playlistItems) return;
      const blob = await pdf(
        <Document>
          {arrayChunks(playlistItems, 12).map((pageChunks, pageIndex) => (
            <PDFPage size="A4" key={`page-${pageIndex}`}>
              {/* Seiteninhalt kann hier ggf. extrahiert oder dupliziert werden, falls gewünscht */}
            </PDFPage>
          ))}
        </Document>
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'playlist-cards.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
                </div>
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
                        <Document>
                            {arrayChunks(playlistItems, 12).map((pageChunks, pageIndex) => (
                                  <Fragment key={`page-group-${pageIndex}`}>
                                    <PDFPage size="A4" key={`page-${pageIndex}`} style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        justifyContent: 'space-between',
                                        padding: '30px'
                                    }}>
                                        <View style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            height: "0.1cm"
                                        }}>
                                            <View style={{
                                                width: "0.1cm",
                                                height: "0.1cm",
                                                borderBottom: "1px solid #000",
                                                borderRight: "1px solid #000"
                                            }}></View>
                                            <View style={{
                                                width: "6.1cm",
                                                borderRight: "1px solid #000"
                                            }}>
                                            </View>
                                            <View style={{width: "6.2cm"}}></View>
                                            <View style={{
                                                width: "6.1cm",
                                                borderLeft: "1px solid #000",
                                            }}></View>
                                            <View style={{
                                                width: "0.1cm",
                                                height: "0.1cm",
                                                borderBottom: "1px solid #000",
                                                borderLeft: "1px solid #000"
                                            }}></View>
                                        </View>
                                        {arrayChunks(pageChunks, 3).map((rowChunk, rowIndex) => (
                                            <View>
                                                <View key={`row-${rowIndex}`}
                                                      style={{
                                                          display: "flex",
                                                          flexDirection: "row",
                                                      }}>
                                                    {rowChunk.map(item => (
                                                        <View key={item.track.id}
                                                              style={{
                                                                  //border: '1px solid #000',
                                                                  width: '6.2cm',
                                                                  height: '6.2cm',
                                                                  textAlign: 'center',
                                                                  display: 'flex',
                                                                  justifyContent: 'center',
                                                                  padding: '10px'
                                                              }}>
                                                            <Text style={{
                                                                fontSize: '0.5cm',
                                                            }}>
                                                                {item.track.name}
                                                            </Text>
                                                            <Text style={{
                                                                fontWeight: 900,
                                                                fontSize: '1.5cm',
                                                                marginTop: '10px',
                                                                marginBottom: '10px'
                                                            }}>
                                                                {dayjs(item.track.album.release_date).format('YYYY')}
                                                            </Text>
                                                            <Text style={{
                                                                fontSize: '0.5cm',
                                                            }}>
                                                                {item.track.artists.map(artist => artist.name).join(', ')}
                                                            </Text>
                                                            {name && (
                                                                <Text style={{
                                                                    fontSize: '0.2cm',
                                                                    marginTop: '20px',
                                                                }}>
                                                                    {name}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    ))}
                                                </View>
                                                <View style={{
                                                    display: "flex",
                                                    flexDirection: "row",
                                                    height: "0.1cm"
                                                }}>
                                                    <View style={{
                                                        width: "0.1cm",
                                                        height: "0.1cm",
                                                        borderBottom: "1px solid #000",
                                                    }}></View>
                                                    <View style={{
                                                        width: "6.1cm",
                                                        borderRight: rowIndex !== 3 ? "1px solid #000": undefined
                                                    }}>
                                                    </View>
                                                    <View style={{width: "6.2cm"}}></View>
                                                    <View style={{
                                                        width: "6.1cm",
                                                        borderLeft: rowIndex !== 3 ? "1px solid #000": undefined,
                                                    }}></View>
                                                    <View style={{
                                                        width: "0.1cm",
                                                        height: "0.1cm",
                                                        borderBottom: "1px solid #000",
                                                    }}></View>
                                                </View>
                                            </View>
                                        ))}
                                        <View style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            height: "0.1cm"
                                        }}>
                                            <View style={{
                                                width: "0.1cm",
                                                height: "0.1cm",
                                                borderRight: "1px solid #000"
                                            }}></View>
                                            <View style={{
                                                width: "6.1cm",
                                                borderRight: "1px solid #000"
                                            }}>
                                            </View>
                                            <View style={{width: "6.2cm"}}></View>
                                            <View style={{
                                                width: "6.1cm",
                                                borderLeft: "1px solid #000",
                                            }}></View>
                                            <View style={{
                                                width: "0.1cm",
                                                height: "0.1cm",
                                                borderLeft: "1px solid #000"
                                            }}></View>
                                        </View>
                                    </PDFPage>
                                    <PDFPage size="A4" key={`page-${pageIndex}`} style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        justifyContent: 'space-between',
                                        padding: '30px'
                                    }}>
                                        <View style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            height: "0.1cm"
                                        }}>
                                            <View style={{
                                                width: "0.1cm",
                                                height: "0.1cm",
                                                borderBottom: "1px solid #000",
                                                borderRight: "1px solid #000"
                                            }}></View>
                                            <View style={{
                                                width: "6.1cm",
                                                borderRight: "1px solid #000"
                                            }}>
                                            </View>
                                            <View style={{width: "6.2cm"}}></View>
                                            <View style={{
                                                width: "6.1cm",
                                                borderLeft: "1px solid #000",
                                            }}></View>
                                            <View style={{
                                                width: "0.1cm",
                                                height: "0.1cm",
                                                borderBottom: "1px solid #000",
                                                borderLeft: "1px solid #000"
                                            }}></View>
                                        </View>
                                        {arrayChunks(pageChunks, 3).map((rowChunk, rowIndex) => (
                                            <View>
                                                <View key={`row-${rowIndex}`}
                                                      style={{
                                                          display: "flex",
                                                          flexDirection: "row-reverse",
                                                      }}>
                                                    {rowChunk.map(item => (
                                                        <>
                                                            {codeType === 'qr' ? (
                                                                <View key={item.track.id}
                                                                      style={{
                                                                          //border: '1px solid #000',
                                                                          width: '6.2cm',
                                                                          height: '6.2cm',
                                                                          textAlign: 'center',
                                                                          display: 'flex',
                                                                          justifyContent: 'center',
                                                                          padding: '10px'
                                                                      }}>
                                                                    <Image src={generateSessionPDFQrCode(`spotify:track:${item.track.id}`)}
                                                                           style={{width: '4cm', margin: '0 auto'}}/>
                                                                </View>
                                                            ) : (
                                                                <View key={item.track.id}
                                                                      style={{
                                                                          //border: '1px solid #000',
                                                                          width: '6.2cm',
                                                                          height: '6.2cm',
                                                                          textAlign: 'center',
                                                                          display: 'flex',
                                                                          justifyContent: 'center',
                                                                          padding: '10px'
                                                                      }}>
                                                                    <Image src={`https://scannables.scdn.co/uri/plain/jpeg/FFFFFF/black/320/spotify:track:` + item.track.id}
                                                                           style={{width: '4cm', margin: '0 auto'}}/>
                                                                </View>
                                                            )}
                                                        </>

                                                    ))}
                                                </View>
                                                <View style={{
                                                    display: "flex",
                                                    flexDirection: "row",
                                                    height: "0.1cm"
                                                }}>
                                                    <View style={{
                                                        width: "0.1cm",
                                                        height: "0.1cm",
                                                        borderBottom: "1px solid #000",
                                                    }}></View>
                                                    <View style={{
                                                        width: "6.1cm",
                                                        borderRight: rowIndex !== 3 ? "1px solid #000": undefined
                                                    }}>
                                                    </View>
                                                    <View style={{width: "6.2cm"}}></View>
                                                    <View style={{
                                                        width: "6.1cm",
                                                        borderLeft: rowIndex !== 3 ? "1px solid #000": undefined,
                                                    }}></View>
                                                    <View style={{
                                                        width: "0.1cm",
                                                        height: "0.1cm",
                                                        borderBottom: "1px solid #000",
                                                    }}></View>
                                                </View>
                                            </View>
                                        ))}
                                        <View style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            height: "0.1cm"
                                        }}>
                                            <View style={{
                                                width: "0.1cm",
                                                height: "0.1cm",
                                                borderRight: "1px solid #000"
                                            }}></View>
                                            <View style={{
                                                width: "6.1cm",
                                                borderRight: "1px solid #000"
                                            }}>
                                            </View>
                                            <View style={{width: "6.2cm"}}></View>
                                            <View style={{
                                                width: "6.1cm",
                                                borderLeft: "1px solid #000",
                                            }}></View>
                                            <View style={{
                                                width: "0.1cm",
                                                height: "0.1cm",
                                                borderLeft: "1px solid #000"
                                            }}></View>
                                        </View>
                                    </PDFPage>
                                </Fragment>
                            ))}
                        </Document>
                    </PDFViewer>
                    </>
                )}
        </div>
    )
}

export default App;
