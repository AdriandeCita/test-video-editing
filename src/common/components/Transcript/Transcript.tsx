import { MouseEventHandler, useCallback } from "react";
import { format } from "date-fns";

import "./Transcript.css";

interface Snippet {
  runs: [
    {
      text: string;
    },
  ];
}

export interface YtTranscriptExtracted {
  startMs: string;
  endMs: string;
  offsetFromPrevious: number;
  snippet: Snippet;
}

const getTime = (timeMs: number): string => format(timeMs, "mm:ss");
const serializeSnippet = (data: Snippet) =>
  data.runs.map(({ text }) => text).join(" ");

const Row = ({
  entry,
  onRemove,
}: {
  entry: YtTranscriptExtracted;
  onRemove: () => void;
}) => {
  const handleRemoval = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (event) => {
      event.stopPropagation();
      onRemove();
    },
    [onRemove],
  );

  return (
    <div className={"transcript__row"}>
      <div className="transcript__row-time">
        {getTime(parseInt(entry.startMs))}
      </div>
      <div className="caption">{serializeSnippet(entry.snippet)}</div>
      <button className="transcript__row-button" onClick={handleRemoval}>
        Remove
      </button>
    </div>
  );
};

const Transcript = ({
  transcript,
  onRemove,
}: {
  transcript: YtTranscriptExtracted[];
  onRemove: (_: YtTranscriptExtracted) => void;
}) => {
  return (
    <div className="transcript__container">
      {transcript.map((entry, index) => (
        <Row onRemove={() => onRemove(entry)} key={index} entry={entry} />
      ))}
    </div>
  );
};

export default Transcript;
