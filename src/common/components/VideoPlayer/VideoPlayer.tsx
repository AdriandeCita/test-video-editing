import { useEffect, useRef } from "react";
import videojs from "video.js";
import Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";

const videoJsOptions = {
  autoplay: false,
  controls: true,
  responsive: true,
  fluid: true,
};

export type VideoMime = "video/mp4";

const VideoPlayer = ({
  originalVideoSrc,
}: {
  originalVideoSrc: {
    src: string;
    type: VideoMime;
  };
}) => {
  const videoRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode.
      const videoElement = document.createElement("video-js");

      videoElement.classList.add("vjs-big-play-centered");
      videoRef.current.appendChild(videoElement);

      playerRef.current = videojs(
        videoElement,
        {
          ...videoJsOptions,
          src: [originalVideoSrc],
        },
        () => {
          videojs.log("player is ready");
        },
      );

      // You could update an existing player in the `else` block here
      // on prop change, for example:
    } else {
      const player = playerRef.current;

      if (player) {
        player.autoplay(videoJsOptions.autoplay);
        player.src([originalVideoSrc]);
      }
    }
  }, [videoRef, originalVideoSrc]);

  // Dispose the Video.js player when the functional component unmounts
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        console.log("disposing the player");
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player>
      <div ref={videoRef} />
    </div>
  );
};

export default VideoPlayer;
