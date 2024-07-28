const videoDeviceInputOption = document.getElementById(
  "video-device-input-option"
);
const videoSourceOption = document.getElementById("video-source-option");
const videoDeviceFrameRateOption = document.getElementById(
  "video-device-frame-rate-option"
);
const VideoDeviceResolutionOption = document.getElementById(
  "video-device-resolution-option"
);
const localVideo = document.getElementById("local-video");

// variables
let __localVideoStream;

// Gettters and setters
async function getLocalVideoStream() {
  if (!__localVideoStream) {
    const stream = await loadCurrentVideoSourceStream();
    __localVideoStream = stream;
  }

  return __localVideoStream;
}
function clearLocalVideoStream() {
  if (!__localVideoStream) return;
  __localVideoStream.getTracks().forEach((track) => track.stop());
  __localVideoStream = null;
}
function getVideoSourceOption() {
  return videoSourceOption.value;
}
function getVideoDeviceId() {
  return videoDeviceInputOption.value;
}
function getVideoDeviceFrameRate() {
  return videoDeviceFrameRateOption.value;
}
function getVideoDeviceResolution() {
  return VideoDeviceResolutionOption.value;
}
async function getVideoSourceFrameRates() {
  const videoSource = getVideoSourceOption();
  switch (videoSource) {
    case "camera":
      return await getAvailableCameraFPS();
    case "screen":
      return [];
    default:
      return [];
  }
}
async function getVideoSourceResolutions() {
  const videoSource = getVideoSourceOption();
  switch (videoSource) {
    case "camera":
      return await getAvailableCameraResolutions();
    case "screen":
      return [];
    default:
      return [];
  }
}

// Event bindings
videoSourceOption.addEventListener("change", handleVideoSourceChanged);
videoDeviceFrameRateOption.addEventListener(
  "change",
  handleVideoSourceSettingsChanged
);
VideoDeviceResolutionOption.addEventListener("change", async () => {
  await renderVideoSourceFrameRates();
  await handleVideoSourceSettingsChanged();
});

// render functions
async function renderLocalVideoStream() {
  const stream = await getLocalVideoStream();
  localVideo.srcObject = stream;
}

async function renderCameraDevices() {
  await navigator.mediaDevices.getUserMedia({ video: true });
  const devices = await getAvailableCameraDevices();
  videoDeviceInputOption.innerHTML = "";
  devices.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.text = device.label;
    videoDeviceInputOption.appendChild(option);
  });
}

async function clearCameraDevices() {
  videoDeviceInputOption.innerHTML = `<option value="">Choose Camera</option>`;
}

async function renderVideoSourceFrameRates() {
  const availableFPS = await getVideoSourceFrameRates();
  videoDeviceFrameRateOption.innerHTML = "";
  availableFPS.forEach((fps) => {
    const option = document.createElement("option");
    option.value = fps;
    option.text = `${fps} FPS`;
    videoDeviceFrameRateOption.appendChild(option);
  });
}

async function renderVideoSourceResolutions() {
  const availableResolutions = await getVideoSourceResolutions();
  VideoDeviceResolutionOption.innerHTML = "";
  availableResolutions.forEach((resolution) => {
    const option = document.createElement("option");
    option.value = `${resolution.width}x${resolution.height}`;
    option.text = `${resolution.width}x${resolution.height}`;
    VideoDeviceResolutionOption.appendChild(option);
  });
}

function enableVideoSettings() {
  videoDeviceInputOption.disabled = false;
  videoDeviceFrameRateOption.disabled = false;
  VideoDeviceResolutionOption.disabled = false;
}

function disableVideoSettings() {
  videoDeviceInputOption.disabled = true;
  videoDeviceFrameRateOption.disabled = true;
  VideoDeviceResolutionOption.disabled = true;
}

// utility functions
async function getAvailableCameraDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

// event handlers
async function handleVideoSourceChanged() {
  clearLocalVideoStream();

  const videoSource = getVideoSourceOption();

  if (videoSource === "camera") {
    await renderCameraDevices();
  } else {
    await clearCameraDevices();
  }

  if (videoSource === "screen" || videoSource === "camera") {
    enableVideoSettings();
  } else {
    disableVideoSettings();
  }

  await renderVideoSourceResolutions();
  await renderVideoSourceFrameRates();

  await renderLocalVideoStream();
}

async function handleVideoSourceSettingsChanged() {
  clearLocalVideoStream();
  await renderLocalVideoStream();
}

// stream load functions
async function loadCurrentVideoSourceStream() {
  const videoSource = getVideoSourceOption();
  clearLocalVideoStream();

  switch (videoSource) {
    case "camera":
      return await loadCameraStream();
    case "screen":
      return await loadScreenStream();
    default:
      return undefined;
  }
}

async function loadCameraStream() {
  const width = parseInt(getVideoDeviceResolution().split("x")[0]);
  const height = parseInt(getVideoDeviceResolution().split("x")[1]);
  const fps = parseInt(getVideoDeviceFrameRate());
  return await navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: { exact: getVideoDeviceId() },
      frameRate: { exact: fps },
      width: { exact: width },
      height: { exact: height },
    },
    audio: false,
  });
}

async function loadScreenStream() {
  return await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });
}

// utility functions
async function getAvailableCameraResolutions() {
  const possibleResolutions = [
    { width: 3840, height: 2160 },
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 1024 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 800, height: 600 },
    { width: 640, height: 480 },
    { width: 320, height: 240 },
  ];

  const supportedResolutions = [];

  for (const res of possibleResolutions) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { exact: res.width },
          height: { exact: res.height },
        },
      });

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();

      // Push the actual resolution
      supportedResolutions.push({
        width: settings.width,
        height: settings.height,
      });

      track.stop();
    } catch (error) {}
  }

  // Remove duplicates
  const uniqueResolutions = Array.from(
    new Set(supportedResolutions.map(JSON.stringify)),
    JSON.parse
  );

  return uniqueResolutions;
}

async function measureCameraFPSForResolution(width, height) {
  const possibleFPS = [90, 60, 30, 15];
  const supportedFPS = [];

  for (const fps of possibleFPS) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { exact: width },
          height: { exact: height },
          frameRate: { exact: fps },
        },
      });

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const actualFPS = settings.frameRate;

      if (actualFPS >= fps - 5 && actualFPS <= fps + 5) {
        // Allowing a small margin of error
        supportedFPS.push(actualFPS);
      }

      track.stop();
    } catch (error) {}
  }

  return supportedFPS;
}

async function getAvailableCameraFPS() {
  const currentResolution = getVideoDeviceResolution();
  const width = parseInt(currentResolution.split("x")[0]);
  const height = parseInt(currentResolution.split("x")[1]);
  const fps = await measureCameraFPSForResolution(width, height);
  return fps;
}
