const {desktopCapturer, ipcRenderer, remote} = require('electron')
const domify = require('domify')

let localStream
let microAudioStream
let recordedChunks = []
let numRecordedChunks = 0
let recorder
let includeMic = false

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#record-desktop').addEventListener('click', recordDesktop)
  document.querySelector('#record-stop').addEventListener('click', stopRecording)
})

const disableButtons = () => {
  document.querySelector('#record-desktop').disabled = true
  document.querySelector('#record-stop').hidden = false
}

const enableButtons = () => {
  document.querySelector('#record-desktop').disabled = false
  document.querySelector('#record-stop').hidden = true
}


const cleanRecord = () => {
  let video = document.querySelector('video');
  video.controls = false;
  recordedChunks = []
  numRecordedChunks = 0
}
 
ipcRenderer.on('source-id-selected', (event, sourceId) => {
  // Users have cancel the picker dialog.
  if (!sourceId) return
  console.log(sourceId)
  document.querySelector('#view-1').classList.remove('hidden')
  document.querySelector('#view-2').classList.add('hidden')
  onAccessApproved(sourceId)
})

const recordDesktop = () => {
  cleanRecord()
  ipcRenderer.send('show-picker', { types: ['screen'] })
}

const recorderOnDataAvailable = (event) => {
  if (event.data && event.data.size > 0) {
    recordedChunks.push(event.data)
    numRecordedChunks += event.data.byteLength
  }
}

const stopRecording = () => {
  console.log('Stopping record and starting download')
  enableButtons()
  recorder.stop()
  document.querySelector('#view-1').classList.add('hidden')
  document.querySelector('#view-2').classList.remove('hidden')
  localStream.getVideoTracks()[0].stop()
}


const getMediaStream = (stream) => {
  let video = document.querySelector('video')
  video.src = URL.createObjectURL(stream)
  localStream = stream
  stream.onended = () => { console.log('Media stream ended.') }

  let videoTracks = localStream.getVideoTracks()

  if (includeMic) {
    console.log('Adding audio track.')
    let audioTracks = microAudioStream.getAudioTracks()
    localStream.addTrack(audioTracks[0])
  }
  try {
    console.log('Start recording the stream.')
    recorder = new MediaRecorder(stream)
  } catch (e) {
    console.assert(false, 'Exception while creating MediaRecorder: ' + e)
    return
  }
  recorder.ondataavailable = recorderOnDataAvailable
  recorder.onstop = () => { console.log('recorderOnStop fired') }
  recorder.start()
  console.log('Recorder is started.')
  disableButtons()
}

const getUserMediaError = () => {
  console.log('getUserMedia() failed.')
}

const onAccessApproved = (id) => {
  if (!id) {
    console.log('Access rejected.')
    return
  }
  console.log('Window ID: ', id)
  navigator.webkitGetUserMedia({
    audio: false,
    video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id,
      maxWidth: window.screen.width, maxHeight: window.screen.height } }
  }, getMediaStream, getUserMediaError)
}
