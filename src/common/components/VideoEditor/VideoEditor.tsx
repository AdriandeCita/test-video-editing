import { useCallback, useContext, useMemo } from "react";
import Transcript from "..//Transcript/Transcript";

import VideoPlayer from "../VideoPlayer/VideoPlayer";
import VideoEditorContext from "../../store/VideoEditor";
import Preloader from "../Preloader/Preloader";
import Slider from "../Slider/Slider";

import "./VideoEditor.css";

function VideoEditor() {
  const {
    currentVideo,
    transcript,
    removeTranscriptEntry,
    isTrimming,
    rangeSelection,
    setRangeSelection,
    trimVideoToRange,
  } = useContext(VideoEditorContext);

  const onRangeSelectionChange = useCallback(
    ([start, end]: Array<number>) => {
      if (setRangeSelection) {
        setRangeSelection({ start, end });
      }
    },
    [setRangeSelection],
  );

  const [min, max] = useMemo(() => {
    return transcript
      ? [0, Math.max(...transcript.map((entry) => parseInt(entry.endMs)))]
      : [0, 100];
  }, [transcript]);

  const isSelectionChanged =
    rangeSelection &&
    (rangeSelection.start !== min || rangeSelection.end !== max);

  return (
    <>
      <main>
        {currentVideo ? <VideoPlayer originalVideoSrc={currentVideo} /> : ""}
        {rangeSelection ? (
          <Slider
            min={min}
            max={max}
            values={[rangeSelection.start, rangeSelection.end]}
            onChange={onRangeSelectionChange}
          />
        ) : (
          ""
        )}
        {isSelectionChanged && trimVideoToRange ? (
          <button className="slider__button" onClick={trimVideoToRange}>
            Apply
          </button>
        ) : (
          ""
        )}
      </main>
      <div className="sidebar">
        {transcript && removeTranscriptEntry ? (
          <Transcript
            transcript={transcript}
            onRemove={removeTranscriptEntry}
          />
        ) : (
          ""
        )}
      </div>
      {isTrimming ? <Preloader caption="Encoding..." /> : ""}
    </>
  );
}

export default VideoEditor;
