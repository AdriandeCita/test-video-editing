import {
  createContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { VideoMime } from "../components/VideoPlayer/VideoPlayer";
import { findLast, get, pick } from "lodash";
import { YtTranscriptExtracted } from "../components/Transcript/Transcript";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const getTranscriptEntries = (transcript: unknown): YtTranscriptExtracted[] => {
  const rawSegments = get(
    transcript,
    "actions.0.updateEngagementPanelAction.content.transcriptRenderer.content.transcriptSearchPanelRenderer.body.transcriptSegmentListRenderer.initialSegments",
  );

  if (Array.isArray(rawSegments)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractedEntries = (rawSegments as Array<any>)
      .filter((entry) => "transcriptSegmentRenderer" in entry)
      .map((entry) => {
        return pick(entry.transcriptSegmentRenderer, [
          "startMs",
          "endMs",
          "snippet",
        ]);
      });
    return extractedEntries.map((entry, index) => ({
      ...entry,
      offsetFromPrevious:
        index === 0
          ? parseInt(entry.startMs)
          : parseInt(entry.startMs) -
            parseInt(extractedEntries[index - 1].endMs),
    }));
  } else {
    throw new Error("Could not find rawSegments in youtube transcript");
  }
};

// TODO: this doesn't seem to work reliably, after a number of iterations
// the timestamps skew
const recalculateTranscriptBoundaries = (
  transcript: YtTranscriptExtracted[],
): YtTranscriptExtracted[] => {
  let previousElement: YtTranscriptExtracted;

  return transcript.map((entry, index) => {
    const { startMs, endMs, offsetFromPrevious } = entry;
    const duration = parseInt(endMs) - parseInt(startMs);

    if (index === 0) {
      previousElement = {
        ...entry,
        startMs: `${offsetFromPrevious}`,
        endMs: `${offsetFromPrevious + duration}`,
      };
      return previousElement;
    } else {
      const { endMs: previousEndMs } = previousElement;
      if (parseInt(previousEndMs) + offsetFromPrevious !== parseInt(startMs)) {
        previousElement = {
          ...entry,
          startMs: `${parseInt(previousEndMs) + offsetFromPrevious}`,
          endMs: `${parseInt(previousEndMs) + offsetFromPrevious + duration}`,
        };
        return previousElement;
      }

      return entry;
    }
  });
};

type VideoObject = {
  src: string;
  type: VideoMime;
};

interface RangeSelection {
  start: number;
  end: number;
}

// Create a new context
const VideoEditorContext = createContext<{
  currentVideo?: VideoObject;
  isTrimming?: boolean;
  transcript?: YtTranscriptExtracted[];
  removeTranscriptEntry?: (_: YtTranscriptExtracted) => void;
  rangeSelection?: RangeSelection;
  setRangeSelection?: (_: RangeSelection) => void;
  trimVideoToRange?: () => void;
}>({});

const validMimeTypes = ["video/mp4"];

// Create a provider component
export const VideoEditorContextProvider = ({
  children,
  videoSrc,
  transcriptSrc,
}: {
  children: ReactNode;
  videoSrc: string;
  transcriptSrc: string;
}) => {
  const [currentVideo, setCurrentVideo] = useState<VideoObject | undefined>(
    undefined,
  );
  const [transcript, setTranscript] = useState<
    YtTranscriptExtracted[] | undefined
  >(undefined);
  const ffmpegRef = useRef(new FFmpeg());
  const [isTrimming, setIsTrimming] = useState(false);
  const [rangeSelection, setRangeSelection] = useState<
    RangeSelection | undefined
  >(undefined);

  // Initializing the state ------------------------------------------------------

  const loadFfmpeg = useCallback(async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message }) => {
      console.log("FFmpeg", message);
    });

    // toBlobURL is used to bypass CORS issue, since we're loading code from a different origin
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
    });
  }, []);

  const loadVideo = useCallback(async () => {
    if (videoSrc) {
      const videoResponse = await fetch(videoSrc);

      const blob = await videoResponse.blob();

      if (!validMimeTypes.includes(blob.type)) {
        throw new Error("Unsupported video format");
      }

      const url = URL.createObjectURL(new Blob([blob], { type: "video/mp4" }));

      setCurrentVideo({
        src: url,
        type: blob.type as VideoMime,
      });
    }
  }, [videoSrc]);

  const loadTranscript = useCallback(async () => {
    if (transcriptSrc) {
      const response = await fetch(transcriptSrc);

      const ytTranscript = await response.json();
      const transcriptEntries = getTranscriptEntries(ytTranscript);

      setTranscript(transcriptEntries);
      setRangeSelection({
        start: 0,
        end: parseInt(transcriptEntries.slice(-1)[0].endMs),
      });
    }
  }, [transcriptSrc]);

  useEffect(() => {
    loadFfmpeg();
    console.info("ffmpeg is loaded");
  }, [loadFfmpeg]);

  useEffect(() => {
    loadVideo();
    console.info("video is loaded");
  }, [loadVideo]);

  useEffect(() => {
    loadTranscript();
    console.info("transcript loaded");
  }, [loadTranscript]);

  // Manipulating the state --------------------------------------------------------

  const _cutPortionOfVideo = useCallback(
    async (inputSrc: string, ffmpegRange: string): Promise<string> => {
      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile("input.mp4", await fetchFile(inputSrc));

      await ffmpeg.exec([
        "-i",
        "input.mp4",
        "-vf",
        `select='${ffmpegRange}', setpts=N/FRAME_RATE/TB`,
        "-af",
        `aselect='${ffmpegRange}', asetpts=N/SR/TB`,
        "output_1.mp4",
      ]);
      const data = await ffmpeg.readFile("output_1.mp4");

      return URL.createObjectURL(
        new Blob([typeof data === "string" ? data : data.buffer], {
          type: "video/mp4",
        }),
      );
    },
    [],
  );

  const removeTranscriptEntry = useCallback(
    async (entry: YtTranscriptExtracted) => {
      if (transcript === undefined) {
        throw Error("Transcript error - transcript is not defined");
      }
      if (!currentVideo) {
        throw new Error("Could not edit the video: video is not defined");
      }

      const index = transcript.indexOf(entry);

      if (index < 0) {
        throw Error("Transcript error - entry not found");
      }

      const filteredTranscript =
        index === transcript.length - 1
          ? transcript.slice(0, index)
          : [
              ...transcript.slice(0, index),
              {
                ...transcript[index + 1],
                // add offsets from both sides of the removed transcript entry
                offsetFromPrevious:
                  transcript[index + 1].offsetFromPrevious +
                  entry.offsetFromPrevious,
              },
              ...transcript.slice(index + 2),
            ];

      const inputSrc = currentVideo.src;

      setIsTrimming(true);

      const [startS, endS] = [
        parseInt(entry.startMs) / 1000,
        parseInt(entry.endMs) / 1000,
      ];

      const url = await _cutPortionOfVideo(
        inputSrc,
        `not(between(t,${startS},${endS}))`,
      );

      setCurrentVideo({
        ...currentVideo,
        src: url,
      });
      const transcriptWithAdjustedTimestamps =
        recalculateTranscriptBoundaries(filteredTranscript);
      setTranscript(transcriptWithAdjustedTimestamps);
      setRangeSelection({
        start: 0,
        end: parseInt(transcriptWithAdjustedTimestamps.slice(-1)[0].endMs),
      });
      setIsTrimming(false);
    },
    [transcript, currentVideo, _cutPortionOfVideo],
  );

  // force selection range to match the closest transcription boundaries
  // so we don't have to cut transcription entries
  const adjustRangeToTranscriptionBoundaries = useCallback(
    ({
      start: initialStart,
      end: initialEnd,
    }: RangeSelection): RangeSelection => {
      if (!transcript) {
        throw new Error("No transcriptions to adjust to");
      }

      let start = initialStart;
      let end = initialEnd;

      adjustingStart: if (initialStart !== 0) {
        const firstIndexAfter = transcript.findIndex(
          (entry) => parseInt(entry.startMs) > start,
        );

        if (firstIndexAfter < 0) {
          // no transcription entries left
          break adjustingStart;
        }

        if (firstIndexAfter === 0) {
          start = parseInt(transcript[firstIndexAfter].startMs);
        } else {
          const rightStartDiff =
            parseInt(transcript[firstIndexAfter].startMs) - start;
          const leftStartDiff =
            start - parseInt(transcript[firstIndexAfter - 1].startMs);

          start = parseInt(
            transcript[
              rightStartDiff < leftStartDiff // right transcript entry is closer to the start
                ? firstIndexAfter
                : firstIndexAfter - 1
            ].startMs,
          );
        }
      }

      adjustingEnd: if (end < parseInt(transcript.slice(-1)[0].endMs)) {
        const firstEntryBefore = findLast(
          transcript,
          (entry) => parseInt(entry.endMs) < end,
        );

        if (!firstEntryBefore) {
          // no transcription entries left
          break adjustingEnd;
        }

        const firstIndexBefore = transcript.indexOf(firstEntryBefore);

        if (firstIndexBefore === transcript.length) {
          end = parseInt(firstEntryBefore.endMs);
        } else {
          const rightEndDiff =
            parseInt(transcript[firstIndexBefore + 1].endMs) - end;
          const leftEndDiff =
            end - parseInt(transcript[firstIndexBefore].endMs);

          end = parseInt(
            transcript[
              rightEndDiff < leftEndDiff // right transcript entry is closer to the end
                ? firstIndexBefore + 1
                : firstIndexBefore
            ].endMs,
          );
        }
      }

      return {
        start,
        end,
      };
    },
    [transcript],
  );

  const trimVideoToRange = useCallback(async () => {
    if (!rangeSelection) {
      throw new Error("Trimming error: range is not defined");
    }
    if (!currentVideo) {
      throw new Error("Could not edit the video: video is not defined");
    }
    if (!transcript) {
      throw new Error("Could not edit transcript: transcript is not defined");
    }

    const { start, end } = adjustRangeToTranscriptionBoundaries(rangeSelection);
    const inputSrc = currentVideo.src;

    setIsTrimming(true);

    const [startS, endS] = [start / 1000, end / 1000];

    const url = await _cutPortionOfVideo(
      inputSrc,
      `between(t,${startS},${endS})`,
    );

    setCurrentVideo({
      ...currentVideo,
      src: url,
    });

    const startIndex =
      start !== 0
        ? transcript.findIndex((entry) => parseInt(entry.startMs) === start)
        : 0;

    const endIndex =
      end > parseInt(transcript.slice(-1)[0].endMs)
        ? transcript.length - 1
        : transcript.findIndex((entry) => parseInt(entry.endMs) === end);

    const filteredTranscriptEntries = transcript.filter(
      (_, index) => index >= startIndex && index <= endIndex,
    );

    const transcriptWithRecalculatedTimestamps =
      recalculateTranscriptBoundaries(
        start !== 0
          ? [
              {
                ...filteredTranscriptEntries[0],
                offsetFromPrevious: 0, // take into account that we cut video at startMs
              },
              ...filteredTranscriptEntries.slice(1),
            ]
          : filteredTranscriptEntries,
      );

    setTranscript(transcriptWithRecalculatedTimestamps);
    setRangeSelection({
      start: 0,
      end: parseInt(transcriptWithRecalculatedTimestamps.slice(-1)[0].endMs),
    });
    setIsTrimming(false);
  }, [
    currentVideo,
    rangeSelection,
    _cutPortionOfVideo,
    transcript,
    adjustRangeToTranscriptionBoundaries,
  ]);

  return (
    <VideoEditorContext.Provider
      value={{
        currentVideo,
        isTrimming,
        transcript,
        removeTranscriptEntry,
        rangeSelection,
        setRangeSelection,
        trimVideoToRange,
      }}
    >
      {children}
    </VideoEditorContext.Provider>
  );
};

export default VideoEditorContext;
