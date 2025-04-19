import {
    Document,
    Page as PDFPage,
    View,
    Text,
    Image,
  } from "@react-pdf/renderer";
  import { Fragment } from "react";
  import dayjs from "dayjs";
  import { Track, PlaylistedTrack } from "@spotify/web-api-ts-sdk";
  
  // 🔹 kleine Hilfsfunktion:
  const chunk = <T,>(arr: T[], n: number) =>
    Array(Math.ceil(arr.length / n))
      .fill(null)
      .map((_, i) => arr.slice(i * n, i * n + n));
  
  type Props = {
    playlistItems: PlaylistedTrack<Track>[];
    name: string;
    codeType: "qr" | "spotify";
    codes: string[];
  };
  
  export default function PDFContent({
    playlistItems,
    name,
    codeType,
    codes,
  }: Props) {
    return (
      <Document>
        {chunk(playlistItems, 12).map((pageTracks, pageIndex) => (
          <Fragment key={`grp-${pageIndex}`}>
            {/* ░░░ Vorderseite ░░░ */}
            <PDFPage
              size="A4"
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                padding: 30,
              }}
            >
              {/* obere Hilfslinie */}
              <GuideRow top />
              {/* 3 × 4 Karten‑Raster */}
              {chunk(pageTracks, 3).map((rowTracks, rowIndex) => (
                <Fragment key={`row-${rowIndex}`}>
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                    }}
                  >
                    {rowTracks.map((item) => (
                      <CardFront
                        key={item.track.id}
                        item={item}
                        personName={name}
                      />
                    ))}
                  </View>
                  <GuideRow />
                </Fragment>
              ))}
              {/* untere Hilfslinie */}
              <GuideRow bottom />
            </PDFPage>
  
            {/* ░░░ Rückseite ░░░ */}
            <PDFPage
              size="A4"
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                padding: 30,
              }}
            >
              <GuideRow top />
              {chunk(pageTracks, 3).map((rowTracks, rowIndex) => (
                <Fragment key={`row-b-${rowIndex}`}>
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row-reverse",
                    }}
                  >
                    {rowTracks.map((item) => (
                      <CardBack
                        key={item.track.id}
                        code={
                          codes[playlistItems.findIndex((t) => t.track.id === item.track.id)]
                        }
                      />
                    ))}
                  </View>
                  <GuideRow />
                </Fragment>
              ))}
              <GuideRow bottom />
            </PDFPage>
          </Fragment>
        ))}
      </Document>
    );
  }
  
  /* ░░░ Hilfs‑Komponenten ░░░ */
  
  const border = "1px solid #000";
  
  const GuideRow = ({ top, bottom }: { top?: boolean; bottom?: boolean }) => (
    <View
      style={{
        display: "flex",
        flexDirection: "row",
        height: "0.1cm",
      }}
    >
      <View
        style={{
          width: "0.1cm",
          height: "0.1cm",
          borderRight: top || bottom ? border : undefined,
          borderBottom: top ? border : undefined,
          borderLeft: bottom ? border : undefined,
        }}
      />
      <View
        style={{
          width: "6.1cm",
          borderRight: border,
          borderLeft: bottom ? border : undefined,
        }}
      />
      <View style={{ width: "6.2cm" }} />
      <View
        style={{
          width: "6.1cm",
          borderLeft: border,
          borderRight: top ? border : undefined,
        }}
      />
      <View
        style={{
          width: "0.1cm",
          height: "0.1cm",
          borderLeft: top || bottom ? border : undefined,
          borderBottom: top ? border : undefined,
          borderRight: bottom ? border : undefined,
        }}
      />
    </View>
  );
  
  const CardFront = ({
    item,
    personName,
  }: {
    item: PlaylistedTrack<Track>;
    personName: string;
  }) => (
    <View
      style={{
        width: "6.2cm",
        height: "6.2cm",
        padding: 10,
        textAlign: "center",
      }}
    >
      <Text style={{ fontSize: "0.5cm" }}>{item.track.name}</Text>
      <Text
        style={{
          fontSize: "1.5cm",
          fontWeight: 900,
          marginTop: 10,
          marginBottom: 10,
        }}
      >
        {dayjs(item.track.album.release_date).format("YYYY")}
      </Text>
      <Text style={{ fontSize: "0.5cm" }}>
        {item.track.artists.map((a) => a.name).join(", ")}
      </Text>
      {personName && (
        <Text style={{ fontSize: "0.25cm", marginTop: 20 }}>{personName}</Text>
      )}
    </View>
  );
  
  const CardBack = ({ code }: { code: string }) => (
    <View
      style={{
        width: "6.2cm",
        height: "6.2cm",
        padding: 10,
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {code && (
        <Image
          src={code}
          style={{ width: "4cm", height: "4cm", margin: "0 auto" }}
        />
      )}
    </View>
  );