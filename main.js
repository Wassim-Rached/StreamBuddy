const peerId_input = document.getElementById("peer-id");
const call_btn = document.getElementById("call-btn");
const myId_input = document.getElementById("my-id");
const connectionStatus = document.getElementById("connection-status");
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const hangup_btn = document.getElementById("hangup-btn");
const shareSelect = document.getElementById("share-select");
const standbyVideo = document.getElementById("standby-video");
const copyBtn = document.getElementById("copy-btn");
const muteBtn = document.getElementById("mute-btn");
const callsDiv = document.getElementById("calls");
const alertsContainer = document.getElementById("alerts-container");

peerId_input.oninput = () => {
  if (!peerId_input.value || peerId_input.value === "") {
    call_btn.disabled = true;
    return;
  }

  console.log(peer && peer.id && peer.id == peerId_input.value);

  if (peer && peer.id && peer.id == peerId_input.value) {
    call_btn.disabled = true;
    return;
  }

  call_btn.disabled = false;
};

let peer;
let currentStream;
let isMuted;

let incomingCalls;
let outgoingCalls;

window.onload = init;

async function init() {
  peer = new Peer();
  shareSelect.value = "none";
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
  const call = peer.call(getPeerId(), currentStream);

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

function getPeerId() {
  return peerId_input.value;
}

function updateConnectionStatus(status) {
  connectionStatus.innerText = status;
  connectionStatus.className = "alert text-center";
  if (status === "Connected") {
    connectionStatus.classList.add("alert-success");
  } else if (status === "Connection closed") {
    connectionStatus.classList.add("alert-danger");
  } else {
    connectionStatus.classList.add("alert-info");
  }
}

function gotLocalStream(stream) {
  localVideo.srcObject = stream;
}

function gotRemoteStream(stream) {
  remoteVideo.srcObject = stream;
}

async function toggleStream() {
  const shareType = shareSelect.value;

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
  muteBtn.disabled = false;
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

function hangup() {
  // Object.values(peer.connections).forEach((connection) => {
  //   connection.forEach((conn) => {
  //     conn.close();
  //   });
  // });

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

  shareSelect.value = "none";
  peerId_input.oninput();
  isCurrenlyInCall = false;
}

async function getStreamByShareType() {
  const shareType = shareSelect.value;
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
  if (standbyVideo.mozCaptureStream()) {
    return standbyVideo.mozCaptureStream();
  }
  return standbyVideo.captureStream();
}

copyBtn.addEventListener("click", () => {
  navigator.clipboard
    .writeText(myId_input.value)
    .then(() => {
      copyBtn.innerText = "Copied!";
      setTimeout(() => {
        copyBtn.innerText = "Copy Link";
      }, 2000);
    })
    .catch((err) => {
      console.log("Error copying text: ", err);
    });
});

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
      muteBtn.innerText = isMuted ? "Unmute" : "Mute";

      // Update the track in the peer connections
      Object.values(peer.connections).forEach((connection) => {
        connection.forEach((conn) => {
          if (!conn.peerConnection) return;
          conn.peerConnection.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === "audio") {
              // Replace track with the updated track (muted/unmuted)
              sender.replaceTrack(track);
            }
          });
        });
      });
    }
  }
}

function renderCalls() {
  callsDiv.innerHTML = "";
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
    callsDiv.appendChild(callDiv);
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

function resetMute() {
  isMuted = false;
  muteBtn.innerText = "Mute";
  muteBtn.disabled = true;
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
  return null; // No active call found
}

function countActiveCalls() {
  let count = 0;
  for (const [peerId, connections] of Object.entries(peer.connections)) {
    for (const conn of connections) {
      if (conn.peerConnection) {
        const senders = conn.peerConnection.getSenders();
        for (const sender of senders) {
          if (sender.track && sender.track.kind === "video") {
            count++;
          }
        }
      }
    }
  }
  return count;
}

function cancelAllOutgoingCalls() {
  for (const call of outgoingCalls.values()) {
    call.close();
  }
  outgoingCalls.clear();
  renderCalls();
}

function pushAlert(message, type = "info") {
  const bootstrapAlert = `
	<div class="alert alert-${type} alert-dismissible fade show fs-7" role="alert">
	  ${message}
	</div>
  `;
  alertsContainer.innerHTML += bootstrapAlert;
  // remove the last alert after 5 seconds
  setTimeout(() => {
    const lastAlert = alertsContainer.lastElementChild;
    if (lastAlert) {
      lastAlert.remove();
    }
  }, 5000);
}
