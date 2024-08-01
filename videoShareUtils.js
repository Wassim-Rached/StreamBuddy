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

// events
const updatePeerConnectionWithNewVideoTrackEvent = new Event(
  "updatePeerConnectionWithNewVideoTrack"
);

// variables
let __localVideoStream;
let __screenStreamInstance;

// Gettters and setters
async function getLocalVideoStream() {
  if (!__localVideoStream) {
    const stream = await loadCurrentVideoSourceStream();
    __localVideoStream = stream;

    //
    window.dispatchEvent(updatePeerConnectionWithNewVideoTrackEvent);

    const videoTrack = stream.getVideoTracks()[0];
    videoTrack.onended = () => {
      console.log("Video sharing ended");
      turnOffVideoSharing();
    };
  }

  return __localVideoStream;
}
function clearLocalVideoStream() {
  if (!__localVideoStream) return;
  const streamType = getVideoSourceOption();
  console.log("Clearing local video stream for : ", streamType);
  __localVideoStream.getTracks().forEach((track) => track.stop());
  __localVideoStream = null;
}
async function getScreenStreamInstance() {
  if (!__screenStreamInstance) {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    __screenStreamInstance = stream;

    //
    const videoTrack = stream.getVideoTracks()[0];
    videoTrack.onended = () => {
      console.log("Screen sharing ended");
      const currentStream = __localVideoStream;
      const videoTrack = currentStream.getVideoTracks()[0];
      videoTrack.stop();
      videoTrack.dispatchEvent(new Event("ended"));
      clearScreenStreamInstance();
    };
  }
  return __screenStreamInstance;
}
function clearScreenStreamInstance() {
  if (!__screenStreamInstance) return;
  __screenStreamInstance.getTracks().forEach((track) => track.stop());
  __screenStreamInstance = null;
}
function getSilentVideoStream(frameRate = 5) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const stream = canvas.captureStream(frameRate);
  return stream;
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
      return await getAvailableScreenFPS();
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
      return await getAvailableScreenResolutions();
    default:
      return [];
  }
}

// todo : changing between sources should refresh settings

// Event bindings
document.addEventListener("DOMContentLoaded", async () => {
  clearCameraDevices();
  videoSourceOption.value = "none";
  videoDeviceInputOption.disabled = true;
  videoDeviceFrameRateOption.disabled = true;
  VideoDeviceResolutionOption.disabled = true;
});

videoSourceOption.addEventListener("change", handleVideoSourceChanged);
videoDeviceInputOption.addEventListener(
  "change",
  handleVideoSourceSettingsChanged
);
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

function clearCameraDevices() {
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

function resetSettings() {
  videoDeviceInputOption.value = "";
  videoDeviceFrameRateOption.value = "";
  VideoDeviceResolutionOption.value = "";
}

// utility functions
async function getAvailableCameraDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

// event handlers
async function handleVideoSourceChanged() {
  resetSettings();
  clearScreenStreamInstance();
  clearLocalVideoStream();

  const videoSource = getVideoSourceOption();

  if (videoSource === "camera") {
    await renderCameraDevices();
  } else {
    clearCameraDevices();
  }

  if (videoSource === "screen") {
    videoDeviceInputOption.disabled = true;
    videoDeviceFrameRateOption.disabled = false;
    VideoDeviceResolutionOption.disabled = false;
  } else if (videoSource === "camera") {
    videoDeviceInputOption.disabled = false;
    videoDeviceFrameRateOption.disabled = false;
    VideoDeviceResolutionOption.disabled = false;
  } else {
    videoDeviceInputOption.disabled = true;
    videoDeviceFrameRateOption.disabled = true;
    VideoDeviceResolutionOption.disabled = true;
  }

  await renderLocalVideoStream();

  await renderVideoSourceResolutions();
  await renderVideoSourceFrameRates();
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
      return getSilentVideoStream();
  }
}

async function loadCameraStream() {
  const width = parseInt(getVideoDeviceResolution().split("x")[0]) || undefined;
  const height =
    parseInt(getVideoDeviceResolution().split("x")[1]) || undefined;
  const fps = parseInt(getVideoDeviceFrameRate()) || undefined;
  const videoDeviceId = getVideoDeviceId() || undefined;

  console.log("new camera stream with : ", {
    width,
    height,
    fps,
    videoDeviceId,
  });

  return await navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: { exact: videoDeviceId },
      frameRate: { exact: fps },
      width: { exact: width },
      height: { exact: height },
    },
    audio: false,
  });
}

async function loadScreenStream() {
  const width = parseInt(getVideoDeviceResolution().split("x")[0]);
  const height = parseInt(getVideoDeviceResolution().split("x")[1]);
  return await getTransformedScreenStream({ width, height });
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

async function getAvailableScreenResolutions() {
  const maxResolution = await getMaxScreenResolution();
  const smallerResolutions = generateSmallerResolutions(maxResolution);
  return smallerResolutions;
}

async function getAvailableScreenFPS() {
  const maxFPS = await getMaxScreenFPS();
  const lowerFPSOptions = generateLowerFPSOptions(maxFPS);

  return lowerFPSOptions;
}

// bunch of annoying functions my brain died
async function getMaxScreenResolution() {
  try {
    const isCurrenlyScreenSharing = getVideoSourceOption() === "screen";
    if (!isCurrenlyScreenSharing) {
      throw new Error("Not currently sharing screen");
    }
    const stream = await getScreenStreamInstance();

    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();

    return { width: settings.width, height: settings.height };
  } catch (error) {
    console.error("Error getting maximum screen resolution:", error);
    return { width: 1920, height: 1080 }; // Default resolution if error occurs
  }
}

function generateSmallerResolutions(maxResolution) {
  const { width, height } = maxResolution;
  const resolutions = [];

  if (width >= 3840 && height >= 2160)
    resolutions.push({ width: 3840, height: 2160 });
  if (width >= 2560 && height >= 1440)
    resolutions.push({ width: 2560, height: 1440 });
  if (width >= 1920 && height >= 1080)
    resolutions.push({ width: 1920, height: 1080 });
  if (width >= 1600 && height >= 900)
    resolutions.push({ width: 1600, height: 900 });
  if (width >= 1366 && height >= 768)
    resolutions.push({ width: 1366, height: 768 });
  if (width >= 1280 && height >= 1024)
    resolutions.push({ width: 1280, height: 1024 });
  if (width >= 1280 && height >= 720)
    resolutions.push({ width: 1280, height: 720 });
  if (width >= 1024 && height >= 768)
    resolutions.push({ width: 1024, height: 768 });
  if (width >= 800 && height >= 600)
    resolutions.push({ width: 800, height: 600 });
  if (width >= 640 && height >= 480)
    resolutions.push({ width: 640, height: 480 });
  if (width >= 320 && height >= 240)
    resolutions.push({ width: 320, height: 240 });

  return resolutions;
}

function transformStreamToResolution(stream, targetResolution) {
  const { width, height } = targetResolution;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const video = document.createElement("video");
  video.srcObject = stream;
  video.play();

  const fps = parseInt(getVideoDeviceFrameRate());
  console.log({ fps });
  const transformedStream = canvas.captureStream(fps || undefined);

  video.addEventListener("play", () => {
    const drawFrame = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, width, height);
        requestAnimationFrame(drawFrame);
      }
    };
    drawFrame();
  });

  return transformedStream;
}

async function getTransformedScreenStream(preferredResolution) {
  const maxResolution = await getMaxScreenResolution();
  const smallerResolutions = generateSmallerResolutions(maxResolution);

  // Simulate user selection
  const userSelectedResolution =
    smallerResolutions.find(
      (res) =>
        res.width === preferredResolution.width &&
        res.height === preferredResolution.height
    ) || maxResolution;

  if (!userSelectedResolution) {
    showPopup("Invalid resolution selected", "error");
    return;
  }

  const stream = await getScreenStreamInstance();

  const transformedStream = transformStreamToResolution(
    stream,
    userSelectedResolution
  );

  return transformedStream;
}

//
async function getMaxScreenFPS() {
  try {
    const stream = await getScreenStreamInstance();

    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    const maxFPS = settings.frameRate;

    return maxFPS;
  } catch (error) {
    console.error("Error getting maximum screen FPS:", error);
    return 30; // Default FPS if error occurs
  }
}

function generateLowerFPSOptions(maxFPS) {
  const possibleFPS = [120, 90, 60, 30, 15];
  return possibleFPS.filter((fps) => fps <= maxFPS);
}

//
async function updatePeerConnectionWithNewVideoTrack(peerConnection) {
  const stream = await getLocalVideoStream();
  const videoTrack = stream.getVideoTracks()[0];
  const sender = peerConnection
    .getSenders()
    .find((s) => s.track.kind === "video");
  sender.replaceTrack(videoTrack);
}

function turnOffVideoSharing() {
  videoSourceOption.value = "none";
  videoSourceOption.dispatchEvent(new Event("change"));
}
