import Layout from './editor/Layout'
import TheatreSync from './theatre/TheatreSync'
import { useWebMIDI } from './utils/webMidi'

function App() {
  useWebMIDI();
  return (
    <>
      <TheatreSync />
      <Layout />
    </>
  )
}

export default App
