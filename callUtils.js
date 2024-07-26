const audioDeviceOutputOption = document.getElementById(
  "audioDeviceInputOption"
);
const audioDeviceInputOption = document.getElementById(
  "audioDeviceOutputOption"
);
const audioCheckbox = document.getElementById("audio-checkbox");
const localAudio = document.getElementById("local-audio");
const testAudio = document.getElementById("test-audio");
const remoteAudio = document.getElementById("remote-audio");
const audioInputVolume = document.getElementById("audio-input-volume");
const audioOutputVolume = document.getElementById("audio-output-volume");
const audioSettings = document.getElementById("audio-settings");
const toogleAudioSettingsBtn = document.getElementById("toogle-audio-settings");
const audioTestBtn = document.getElementById("audio-test-btn");

// events
document.addEventListener("DOMContentLoaded", async () => {
  await renderAudioInputDevices();
  await renderAudioOutputDevices();

  navigator.mediaDevices.ondevicechange = async () => {
    await renderAudioInputDevices();
    await renderAudioOutputDevices();
  };
});
audioCheckbox.addEventListener("change", handleAudioCheckboxChange);
toogleAudioSettingsBtn.addEventListener("click", toogleShowingAudioSettings);
audioInputVolume.addEventListener("input", handleAudioInputVolumeChange);
audioOutputVolume.addEventListener("input", handleAudioOutputVolumeChange);
audioTestBtn.addEventListener("click", toogleListenToTestAudio);

// variables
let __localAudioStream = null;
let __remoteAudioStream = null;
let __audioInputDeviceId = null;

// variables functions
async function getLocalAudioStream() {
  if (!__localAudioStream) {
    __localAudioStream = await loadNewAudioStream();
    // this part is called whenever new audio stream is created
    const shouldBeMuted = !audioCheckbox.checked;
    if (shouldBeMuted) {
      muteAudioStream(__localAudioStream);
    }
    visualizeAudioStream(__localAudioStream, "local-stream-canvas");
  }
  return __localAudioStream;
}
function setLocalAudioStream(stream) {
  __localAudioStream = stream;
}
function getRemoteAudioStream() {
  return __remoteAudioStream;
}
function setRemoteAudioStream(stream) {
  __remoteAudioStream = stream;
}
function getAudioInputDeviceId() {
  return __audioInputDeviceId;
}
function setAudioInputDeviceId(deviceId) {
  __audioInputDeviceId = deviceId;
}
function getAudioInputVolume() {
  return audioInputVolume.value;
}
function getAudioOutputVolume() {
  return audioOutputVolume.value;
}

// functions
async function handleAudioCheckboxChange() {
  const isChecked = audioCheckbox.checked;
  const stream = await getLocalAudioStream();
  if (isChecked) {
    unmuteAudioStream(stream);
  } else {
    muteAudioStream(stream);
  }
}

async function handleAudioInputVolumeChange() {
  console.log("audio input volume changed to", getAudioInputVolume());
  const stream = await getLocalAudioStream();
  changeStreamVolume(stream, getAudioInputVolume());

  const isStreamMuted = stream
    .getAudioTracks()
    .every((track) => !track.enabled);

  console.log({ isStreamMuted });

  // bit of bad code here tbh
  const testStream = testAudio.srcObject;
  if (testStream) {
    changeStreamVolume(testStream, getAudioInputVolume());
  }
}

async function handleAudioOutputVolumeChange() {
  console.log("audio output volume changed to", getAudioOutputVolume());
  // changeStreamVolume(getRemoteAudioStream(), getAudioOutputVolume());
  const volume = getAudioOutputVolume() / 100;
  remoteAudio.volume = volume;
}

function toogleShowingAudioSettings() {
  const isCurrentlyHidden = audioSettings.style.display === "none";
  audioSettings.style.display = isCurrentlyHidden ? "block" : "none";
}

// function to get devices
async function getAudioInputDevices() {
  await navigator.mediaDevices.getUserMedia({ audio: true });
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "audioinput");
}

async function getAudioOutputDevices() {
  await navigator.mediaDevices.getUserMedia({ audio: true });
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "audiooutput");
}

// function to update devices
async function renderAudioInputDevices() {
  const devices = await getAudioInputDevices();
  audioDeviceInputOption.innerHTML = "";
  devices.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.text = device.label;
    audioDeviceInputOption.appendChild(option);
  });
}

async function renderAudioOutputDevices() {
  const devices = await getAudioOutputDevices();
  audioDeviceOutputOption.innerHTML = "";
  devices.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.text = device.label;
    audioDeviceOutputOption.appendChild(option);
  });
}

// stream related functions
async function loadNewAudioStream() {
  console.log("new local stream created");
  return await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
}

async function renderLocalAudioStream() {
  const stream = await getLocalAudioStream();
  localAudio.srcObject = stream;
}

async function renderRemoteAudioStream() {
  const stream = getRemoteAudioStream();
  remoteAudio.srcObject = stream;
}

async function muteAudioStream(stream) {
  stream.getAudioTracks().forEach((track) => {
    track.enabled = false;
  });
}

async function unmuteAudioStream(stream) {
  stream.getAudioTracks().forEach((track) => {
    track.enabled = true;
  });
}

async function toogleListenToTestAudio() {
  console.log("toogleListenToTestAudio");
  const isListening = !testAudio.muted;
  console.log({ isListening });
  if (isListening) {
    // stop self listening
    const stream = testAudio.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    } else {
      console.error("SOMETHING WENT WRONG");
    }
    testAudio.srcObject = null;
    testAudio.muted = true;
    audioTestBtn.innerText = "Test Audio";
  } else {
    // start self listening
    const stream = await loadNewAudioStream();
    testAudio.srcObject = stream;
    testAudio.muted = false;
    audioTestBtn.innerText = "Stop Test";
    visualizeAudioStream(stream, "test-stream-canvas");
  }
}

// audio helpers
async function changeStreamVolume(stream, volume) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  const gainNode = audioContext.createGain();
  const destination = audioContext.createMediaStreamDestination();

  source.connect(gainNode);
  gainNode.connect(destination);

  gainNode.gain.value = volume / 100;

  console.log({ volume: gainNode.gain.value });

  return destination.stream;
}

function visualizeAudioStream(stream, canvasId) {
  // Create an audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Create an analyser node
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048; // Size of the FFT (Fast Fourier Transform)

  // Create a source node from the stream
  const source = audioContext.createMediaStreamSource(stream);

  // Connect the source to the analyser
  source.connect(analyser);

  // Create a canvas element to draw the visualization
  const canvas = document.getElementById(canvasId);
  console.log({ canvas });
  canvas.width = 300;
  canvas.height = 100;

  const canvasCtx = canvas.getContext("2d");
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = "#000";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i];
      canvasCtx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
      canvasCtx.fillRect(
        x,
        canvas.height - barHeight / 2,
        barWidth,
        barHeight / 2
      );
      x += barWidth + 1;
    }
  }

  draw();
}
