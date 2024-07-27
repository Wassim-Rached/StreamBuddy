const audioDeviceOutputOption = document.getElementById(
  "audio-device-output-option"
);
const audioDeviceInputOption = document.getElementById(
  "audio-device-input-option"
);
const noiseSuppressionOption = document.getElementById(
  "noise-suppression-option"
);
const echoCancellationOption = document.getElementById(
  "echo-cancellation-option"
);
const agcOption = document.getElementById("agc-option");
const audioCheckbox = document.getElementById("audio-checkbox");
const localAudio = document.getElementById("local-audio");
const testAudio = document.getElementById("test-audio");
const remoteAudio = document.getElementById("remote-audio");
const audioInputVolume = document.getElementById("audio-input-volume");
const audioOutputVolume = document.getElementById("audio-output-volume");
const audioSettings = document.getElementById("audio-settings");
const toogleAudioSettingsBtn = document.getElementById("toogle-audio-settings");
const audioTestBtn = document.getElementById("audio-test-btn");

const updatePeerConnectionWithNewAudioTrackEvent = new Event(
  "updatePeerConnectionWithNewAudioTrack"
);

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
audioDeviceOutputOption.addEventListener(
  "change",
  handleAudioOutputDeviceChange
);
audioDeviceInputOption.addEventListener(
  "change",
  refreshLocalAndTestAudioStream
);
noiseSuppressionOption.addEventListener(
  "change",
  refreshLocalAndTestAudioStream
);
echoCancellationOption.addEventListener(
  "change",
  refreshLocalAndTestAudioStream
);
agcOption.addEventListener("change", refreshLocalAndTestAudioStream);

// variables
let __localAudioStream = null;
let __remoteAudioStream = null;
let __testAudioStream = null;

// variables functions
async function getLocalAudioStream() {
  if (!__localAudioStream) {
    console.log("creating new local audio stream");
    __localAudioStream = await loadNewAudioStream();
    // this part is called whenever new audio stream is created
    const shouldBeMuted = !audioCheckbox.checked;
    if (shouldBeMuted) {
      muteAudioStream(__localAudioStream);
    }
    initializeAudioContext();
    setupLocalAudioStream(__localAudioStream);
    renderLocalAudioStream(__localAudioStream);
  }
  return __localAudioStream;
}
function clearLocalAudioStream() {
  if (__localAudioStream) {
    __localAudioStream.getAudioTracks().forEach((track) => {
      track.stop();
    });
  }
  __localAudioStream = null;
}
async function getDestinationStream() {
  if (!destination) {
    await getLocalAudioStream();
  }
  return destination.stream;
}
// function updateLocalAudioStreamTracks(newStream) {
//   const newAudioTrack = newStream.getAudioTracks()[0];
//   const oldAudioTrack = __localAudioStream.getAudioTracks()[0];

//   // Replace the old audio track with the new one
//   __localAudioStream.removeTrack(oldAudioTrack);
//   __localAudioStream.addTrack(newAudioTrack);

//   console.log("local audio stream updated with new track");
//   // updateVoiceCallPeerStreamWithNewTrack(oldAudioTrack, newAudioTrack);

//   //
//   renderLocalAudioStream(destination.stream);
// }
function getRemoteAudioStream() {
  return __remoteAudioStream;
}
function setRemoteAudioStream(stream) {
  __remoteAudioStream = stream;
}
async function getTestAudioStream() {
  if (!__testAudioStream) {
    console.log("creating new test audio stream");
    __testAudioStream = await loadNewAudioStream();

    // this part is called whenever new test audio stream is created
    initializeAudioContext();
    setupTestAudioStream(__testAudioStream);
    renderTestAudioStream(testDestination.stream);
  }

  return __testAudioStream;
}
function clearTestAudioStream() {
  if (__testAudioStream) {
    __testAudioStream.getAudioTracks().forEach((track) => {
      track.stop();
    });
  }
  __testAudioStream = null;
}
function getAudioInputDeviceId() {
  return audioDeviceInputOption.value;
}
function getAudioOutputDeviceId() {
  return audioDeviceOutputOption.value;
}
function getAudioInputVolume() {
  return audioInputVolume.value;
}
function getAudioOutputVolume() {
  return audioOutputVolume.value;
}
function getNoiseSuppression() {
  return noiseSuppressionOption.value === "true";
}
function getEchoCancellation() {
  return echoCancellationOption.value === "true";
}
function getAGC() {
  return agcOption.value === "true";
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
  const newVolume = getAudioInputVolume();

  await changeLocalStreamVolume(newVolume);
  await changeTestStreamVolume(newVolume);

  window.dispatchEvent(updatePeerConnectionWithNewAudioTrackEvent);
  renderLocalAudioStream(destination.stream);

  const isTestAudioOn = !testAudio.muted;
  if (isTestAudioOn) {
    renderTestAudioStream(testDestination.stream);
  }
}

async function handleAudioOutputVolumeChange() {
  const volume = getAudioOutputVolume() / 100;
  remoteAudio.volume = volume;
}

function handleAudioOutputDeviceChange() {
  const deviceId = getAudioOutputDeviceId();
  remoteAudio.setSinkId(deviceId);
  testAudio.setSinkId(deviceId);
}

async function refreshLocalAndTestAudioStream() {
  const currentlyTesting = !testAudio.muted;

  clearLocalAudioStream();
  clearTestAudioStream();
  clearAudioContext();

  await getLocalAudioStream();
  if (currentlyTesting) {
    await getTestAudioStream();
  }

  await changeLocalStreamVolume(getAudioInputVolume());
  await changeTestStreamVolume(getAudioInputVolume());

  window.dispatchEvent(updatePeerConnectionWithNewAudioTrackEvent);
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
  const deviceId = getAudioInputDeviceId();
  console.log("new local stream created with device id", deviceId);
  return await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      echoCancellation: getEchoCancellation(),
      noiseSuppression: getNoiseSuppression(),
      autoGainControl: getAGC(),
    },
  });
}

function renderLocalAudioStream(stream) {
  localAudio.srcObject = stream;
  visualizeAudioStream(stream, "local-stream-canvas");
}

function renderTestAudioStream(stream) {
  testAudio.srcObject = stream;
  visualizeAudioStream(stream, "test-stream-canvas");
}

async function renderRemoteAudioStream() {
  const stream = getRemoteAudioStream();
  remoteAudio.srcObject = stream;
}

function muteAudioStream(stream) {
  stream.getAudioTracks().forEach((track) => {
    track.enabled = false;
  });
}

function unmuteAudioStream(stream) {
  stream.getAudioTracks().forEach((track) => {
    track.enabled = true;
  });
}

async function toogleListenToTestAudio() {
  const isListening = !testAudio.muted;

  if (isListening) {
    turnOffTestAudio();
  } else {
    turnOnTestAudio();
  }
}

async function turnOnTestAudio() {
  const testStream = await getTestAudioStream();
  unmuteAudioStream(testStream);

  testAudio.srcObject = testDestination.stream;
  testAudio.muted = false;
  audioTestBtn.innerText = "Stop Test";
}

async function turnOffTestAudio() {
  const testStream = await getTestAudioStream();
  muteAudioStream(testStream);

  testAudio.srcObject = testDestination.stream;
  testAudio.muted = true;
  audioTestBtn.innerText = "Test Audio";
}

// visualization
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
  // canvas.width = 300;
  // canvas.height = 100;

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

// volume related functions
let audioContext;
let gainNode;
let testGainNode;
let destination;
let testDestination;

function initializeAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    gainNode = audioContext.createGain();
    testGainNode = audioContext.createGain();

    destination = audioContext.createMediaStreamDestination();
    testDestination = audioContext.createMediaStreamDestination();
  }
}

function clearAudioContext() {
  audioContext = null;
  gainNode = null;
  testGainNode = null;
  destination = null;
  testDestination = null;
}

function setupLocalAudioStream(localAudioStream) {
  if (!audioContext) {
    throw new Error(
      "Audio context is not initialized. Call initializeAudioContext() first."
    );
  }

  console.log({ localAudioStream });
  const source = audioContext.createMediaStreamSource(localAudioStream);
  source.connect(gainNode);
  gainNode.connect(destination);
}

function setupTestAudioStream(testAudioStream) {
  if (!audioContext) {
    throw new Error(
      "Audio context is not initialized. Call initializeAudioContext() first."
    );
  }

  const testSource = audioContext.createMediaStreamSource(testAudioStream);
  testSource.connect(testGainNode);
  testGainNode.connect(testDestination);
}

async function changeLocalStreamVolume(volume) {
  console.log("changing local stream volume to", volume);
  if (!gainNode) {
    // initialize audio context if not already initialized
    await getLocalAudioStream();
  }
  gainNode.gain.value = volume / 100;
}

async function changeTestStreamVolume(volume) {
  console.log("changing test stream volume to", volume);
  if (!testGainNode) {
    // initialize audio context if not already initialized
    await getTestAudioStream();
  }
  testGainNode.gain.value = volume / 100;
}

function updatePeerConnectionWithNewAudioTrack(peerConnection) {
  console.log("updating peer connection with new audio track");
  const newAudioTrack = destination.stream.getAudioTracks()[0];
  const sender = peerConnection
    .getSenders()
    .find((s) => s.track.kind === "audio");

  if (sender) {
    sender.replaceTrack(newAudioTrack);
  } else {
    peerConnection.addTrack(newAudioTrack, destination.stream);
  }
}

// permissions and errors
async function checkMicrophonePermission() {
  try {
    const permissionStatus = await navigator.permissions.query({
      name: "microphone",
    });

    if (permissionStatus.state === "denied") {
      document.getElementById("status-message").innerText =
        "Microphone access is denied. Please allow microphone access in your browser settings.";
    } else {
      requestMicrophoneAccess();
    }
  } catch (error) {
    console.error("Error checking microphone permission:", error);
    requestMicrophoneAccess(); // Fallback in case of error
  }
}
