import { VideoEditorContextProvider } from "./common/store/VideoEditor";
import VideoEditor from "./common/components/VideoEditor/VideoEditor";
import "./App.css";

function App() {
  return (
    <VideoEditorContextProvider
      videoSrc="/src/assets/Is Chat GPT🪄 magic.mp4"
      transcriptSrc="/src/assets/Is Chat GPT🪄 magic.json"
    >
      <VideoEditor />
    </VideoEditorContextProvider>
  );
}

export default App;
