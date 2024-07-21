const peerId_input = document.getElementById("peer-id");
const call_btn = document.getElementById("call-btn");
const myId_input = document.getElementById("my-id");
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const hangup_btn = document.getElementById("hangup-btn");
const shareChoice_select = document.getElementById("share-select");
const standby_video = document.getElementById("standby-video");
const mute_btn = document.getElementById("mute-btn");
const calls_div = document.getElementById("calls");

peerId_input.addEventListener("input", validatePeerIdInput);

// varibles
let peer; // represents the current user
let currentStream; // represents the current stream
let isMuted; // represents the current mute status

let incomingCalls; // represents the incoming calls list
let outgoingCalls; // represents the outgoing calls list

// event listeners
window.addEventListener("load", init);
call_btn.addEventListener("click", call);
hangup_btn.addEventListener("click", hangup);
mute_btn.addEventListener("click", toggleMute);
shareChoice_select.addEventListener("change", toggleStream);

// core logic functions
async function init() {
  peer = new Peer();
  shareChoice_select.value = "none";
  currentStream = await getStreamByShareType();
  isMuted = false;
  incomingCalls = new Map();
  outgoingCalls = new Map();

  gotLocalStream(currentStream);

  peer.on("open", (id) => {
    myId_input.value = id;
  });

  peer.on("call", async (call) => {
    addCall(call);
  });
}

async function call() {
  if (!currentStream) {
    currentStream = await getStreamByShareType();
  }
  gotLocalStream(currentStream);
  const call = peer.call(peerId_input.value, currentStream);

  call.on("stream", (stream) => {
    gotRemoteStream(stream);
    updateConnectionStatus("Connected");
    hangup_btn.disabled = false;
  });

  call.on("error", (err) => {
    console.log("Error", err);
    pushAlert("Call Offer No Longer Valid", "danger");
    updateConnectionStatus("Error");
  });

  call.on("close", () => {
    updateConnectionStatus("Connection closed");
    hangup();
  });
}

async function answerCall(callPeerId) {
  const call = incomingCalls.get(callPeerId);
  if (!call) {
    alert("Call not found");
    removeCall(callPeerId);
    return;
  }

  if (getActiveCall()) {
    const areYouSure = confirm(
      "You are already in a call. Do you want to hang up and answer this call?"
    );
    if (!areYouSure) return;
    hangup();
  } else {
    const areYouSure = confirm("Do you want to answer this call?");
    if (!areYouSure) return;
  }

  cancelAllOutgoingCalls();

  if (!currentStream) {
    currentStream = await getStreamByShareType();
  }
  gotLocalStream(currentStream);
  call.answer(currentStream);

  call.on("stream", (stream) => {
    gotRemoteStream(stream);
    updateConnectionStatus("Connected");
    peerId_input.value = call.peer;
    hangup_btn.disabled = false;
  });

  call.on("error", (err) => {
    console.log("Error", err);
    pushAlert("Call Offer No Longer Valid", "danger");
    updateConnectionStatus("Error");
  });

  call.on("close", () => {
    updateConnectionStatus("Connection closed");
    hangup();
  });

  removeCall(callPeerId);
}

function hangup() {
  const activeCall = getActiveCall();
  if (activeCall) {
    activeCall.close();
  }

  updateConnectionStatus("idle");
  localVideo.srcObject = getStandbyStream();
  remoteVideo.srcObject = null;
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }

  hangup_btn.disabled = true;

  shareChoice_select.value = "none";
  validatePeerIdInput();
  isCurrenlyInCall = false;
}

// stream related functions
function gotLocalStream(stream) {
  localVideo.srcObject = stream;
}

function gotRemoteStream(stream) {
  remoteVideo.srcObject = stream;
}

async function toggleStream() {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
  }

  currentStream = await getStreamByShareType();
  gotLocalStream(currentStream);

  Object.values(peer.connections).forEach((connection) => {
    connection.forEach((conn) => {
      if (!conn.peerConnection) return;
      conn.peerConnection.getSenders().forEach((sender) => {
        if (!sender.track) return;

        if (sender.track.kind === "video") {
          sender.replaceTrack(currentStream.getVideoTracks()[0]);
        } else if (sender.track.kind === "audio") {
          sender.replaceTrack(currentStream.getAudioTracks()[0]);
        }
      });
    });
  });
}

async function getUserMediaStream() {
  const res = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  resetMute();
  mute_btn.disabled = false;
  return res;
}

async function getDisplayMediaStream() {
  const res = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });
  resetMute();
  return res;
}

async function getStreamByShareType() {
  const shareType = shareChoice_select.value;
  if (shareType === "camera") {
    return await getUserMediaStream();
  } else if (shareType === "screen") {
    return await getDisplayMediaStream();
  } else if (shareType === "none") {
    return getStandbyStream();
  } else {
    console.error("Invalid share type");
    return await getUserMediaStream();
  }
}

function getStandbyStream() {
  resetMute();
  if (standby_video.mozCaptureStream()) {
    return standby_video.mozCaptureStream();
  }
  return standby_video.captureStream();
}

function toggleMute() {
  if (currentStream) {
    const audioTracks = currentStream.getAudioTracks();
    if (audioTracks.length > 0) {
      const track = audioTracks[0];

      // Stop the track if muted, otherwise restart it
      if (isMuted) {
        track.enabled = true; // Unmute
      } else {
        track.enabled = false; // Mute
      }

      isMuted = !isMuted;
      mute_btn.innerText = isMuted ? "Unmute" : "Mute";

      Object.values(peer.connections).forEach((connection) => {
        connection.forEach((conn) => {
          if (!conn.peerConnection) return;
          conn.peerConnection.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === "audio") {
              sender.replaceTrack(track);
            }
          });
        });
      });
    }
  }
}

function resetMute() {
  isMuted = false;
  mute_btn.innerText = "Mute";
  mute_btn.disabled = true;
}

// Call related functions
function renderCalls() {
  calls_div.innerHTML = "";
  Array.from(incomingCalls.values()).forEach((call) => {
    const callDiv = document.createElement("div");
    callDiv.innerHTML = `
		<div class="container mt-4">
			<div class="row">
				<div class="col-md-6 col-lg-4">
					<div class="card shadow-sm mb-3">
						<div class="card-body">
							<h5 class="card-title mb-3 fs-6 text-center">${call.peer}</h5>
							<button class="btn btn-success w-100 mb-2" onclick="answerCall('${call.peer}')">Answer</button>
							<button class="btn btn-danger w-100" onclick="rejectCall('${call.peer}')">Reject</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
    calls_div.appendChild(callDiv);
  });
}

function addCall(call) {
  incomingCalls.set(call.peer, call);
  renderCalls();
}

function removeCall(peerId) {
  incomingCalls.delete(peerId);
  renderCalls();
}

function getActiveCall() {
  // Loop through all connections
  for (const [peerId, connections] of Object.entries(peer.connections)) {
    for (const conn of connections) {
      // Check if the connection is a call and if it has an active stream
      if (conn.peerConnection) {
        const senders = conn.peerConnection.getSenders();
        for (const sender of senders) {
          if (sender.track && sender.track.kind === "video") {
            return conn; // Return the active call
          }
        }
      }
    }
  }
  return null;
}

function cancelAllOutgoingCalls() {
  for (const call of outgoingCalls.values()) {
    call.close();
  }
  outgoingCalls.clear();
  renderCalls();
}
