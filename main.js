const peerIdInput = document.getElementById("peer-id");
// const call_btn = document.getElementById("call-btn");
const myId_input = document.getElementById("my-id");
const hangupBtn = document.getElementById("hangup-btn");
// const shareChoice_select = document.getElementById("share-select");
// const standby_video = document.getElementById("standby-video");
// const mute_btn = document.getElementById("mute-btn");
const incommingCallsContainer = document.getElementById(
  "incomming-calls-container"
);
const outgoingCallsContainer = document.getElementById(
  "outgoing-calls-container"
);
// const sendMessage_btn = document.getElementById("send-message-btn");
// const chatMessage_input = document.getElementById("chat-message-input");
// const sendFile_btn = document.getElementById("send-file-btn");
// const fileInput = document.getElementById("file-input");
const connectBtn = document.getElementById("connect-btn");

function getOtherPeerId() {
  return peerIdInput.value;
}

// peerId_input.addEventListener("input", validatePeerIdInput);
// chatMessage_input.addEventListener("keydown", (e) => {
//   if (e.key === "Enter") {
//     sendMessage_btn.click();
//   }
// });
// sendMessage_btn.addEventListener("click", (e) => {
//   chatChannel.send({ type: "chat-message", message: chatMessage_input.value });
//   pushChatMessage(chatMessage_input.value, true);
// });

const coreConnectionEstablishedSuccessfullyEvent = new CustomEvent(
  "coreConnectionEstablishedSuccessfully"
);
const coreConnectionHangupEvent = new CustomEvent("coreConnectionHangup");

// varibles
let peer; // represents the current user
let currentStream; // represents the current stream
let isMuted; // represents the current mute status
let chatChannel; // represents the chat channel

let coreConnection;
let outGoingCoreConnectionRequests = new Map();
let inCommingCoreConnectionRequests = new Map();

let incomingCalls; // represents the incoming calls list
let outgoingCalls; // represents the outgoing calls list

// event listeners
window.addEventListener("load", init);
// call_btn.addEventListener("click", call);
hangupBtn.addEventListener("click", closeCoreConnection);
// mute_btn.addEventListener("click", toggleMute);
// shareChoice_select.addEventListener("change", toggleStream);
// sendFile_btn.addEventListener("click", sendFile);
connectBtn.addEventListener("click", (e) =>
  sendCoreConnectionRequest(getOtherPeerId())
);

// window events
window.addEventListener(
  "coreConnectionEstablishedSuccessfully",
  onCoreConnectionEstablishedSuccessfully
);

window.addEventListener("coreConnectionHangup", onCoreConnectionHangup);

// core logic functions
function onCoreConnectionEstablishedSuccessfully() {
  showPopup("Core connection established successfully", "success");
  peerIdInput.value = coreConnection.peer;
  connectBtn.disabled = true;
  hangupBtn.disabled = false;
  updateConnectionStatus("Connected");
}

function onCoreConnectionHangup() {
  showPopup("Core connection hangup successfully", "success");
  connectBtn.disabled = false;
  hangupBtn.disabled = true;
  updateConnectionStatus("idle");
}

async function init() {
  peer = new Peer();
  // shareChoice_select.value = "none";
  // currentStream = await getStreamByShareType();
  isMuted = false;
  incomingCalls = new Map();
  outgoingCalls = new Map();
  chatChannel = undefined;

  // gotLocalStream(currentStream);

  peer.on("open", handlePeerConnectionOpen);

  peer.on("call", handlePeerConnectionCall);

  peer.on("connection", handlePeerConnectionConnection);

  // resetFileSharing();
  // resetChatMessages();
}

// peer related functions
function handlePeerConnectionOpen(id) {
  myId_input.value = id;
}

function handlePeerConnectionCall(call) {
  addCall(call);
}

function handlePeerConnectionConnection(conn) {
  // reciver function
  switch (conn.metadata.type) {
    case "core":
      addInCommingCoreConnectionRequest(conn);
      conn.on("data", (data) => {
        switch (data.type) {
          case "connection-aborted":
            removeInCommingCoreConnectionRequest(conn.peer);
            showPopup(
              "Core connection request aborted by : " + conn.peer,
              "error"
            );
          default:
            console.error("Unknown message type", data.type);
        }
      });
      conn.on("close", () => onCoreConnectionClose(conn));
      break;
    default:
      console.error("Unknown connection type", conn.metadata.type);
  }

  // chatChannel = conn;
  // setupChatChannel(chatChannel);
}

// core connection related functions
function sendCoreConnectionRequest(peerId) {
  // sender function
  const conn = peer.connect(peerId, {
    metadata: { type: "core" },
  });

  conn.on("data", (data) => {
    switch (data.type) {
      case "connection-accepted":
        coreConnection = outGoingCoreConnectionRequests.get(peerId);
        window.dispatchEvent(coreConnectionEstablishedSuccessfullyEvent);
        removeInCommingCoreConnectionRequest(peerId);
        removeOutGoingCoreConnectionRequest(peerId);
        break;
      case "connection-rejected":
        removeOutGoingCoreConnectionRequest(peerId);
        showPopup("Core connection request rejected by : " + peerId, "error");
        break;
      default:
        console.error("Unknown message type", data);
    }
  });

  conn.on("close", () => onCoreConnectionClose(conn));

  addOutGoingCoreConnectionRequest(conn);
  showPopup("Core connection request sent", "info");
}

function acceptCoreConnectionRequest(peerId) {
  // reciver function
  const conn = getInCommingCoreConnectionRequest(peerId);
  conn.send({ type: "connection-accepted" });
  coreConnection = conn;
  window.dispatchEvent(coreConnectionEstablishedSuccessfullyEvent);
  removeInCommingCoreConnectionRequest(peerId);
}

function rejectCoreConnectionRequest(peerId) {
  // reciver function
  const conn = getInCommingCoreConnectionRequest(peerId);
  conn.send({ type: "connection-rejected" });
  conn.close();
  removeInCommingCoreConnectionRequest(peerId);
}

function onCoreConnectionClose(conn) {
  // this function is only intended for the one coreConnection
  // that is already established
  if (!coreConnection) return;
  if (conn.peer !== coreConnection.peer) return;

  console.log("Core connection closed");
  coreConnection = undefined;
  window.dispatchEvent(coreConnectionHangupEvent);
}

function closeCoreConnection() {
  if (coreConnection && coreConnection.open) {
    coreConnection.close();
  }
}

// call related functions
// function handleCallStream(stream) {
//   gotRemoteStream(stream);
//   peerId_input.value = getActiveCall().peer;

//   chatChannel = peer.connect(getActiveCall().peer);
//   setupChatChannel(chatChannel);

//   turnOnFileSharing();

//   hangup_btn.disabled = false;

//   updateConnectionStatus("Connected");
// }

// function handleCallError(err) {
//   pushAlert("Call Offer No Longer Valid", "danger");
//   updateConnectionStatus("Error");
// }

// function handleCallClose() {
//   updateConnectionStatus("Connection closed");
//   hangup();
// }

// async function call() {
//   if (!currentStream) {
//     currentStream = await getStreamByShareType();
//   }
//   gotLocalStream(currentStream);
//   const call = peer.call(getOtherPeerId(), currentStream);

//   call.on("stream", handleCallStream);

//   call.on("error", handleCallError);

//   call.on("close", handleCallClose);
// }

// async function answerCall(callPeerId) {
//   const call = incomingCalls.get(callPeerId);
//   if (!call) {
//     alert("Call not found");
//     removeCall(callPeerId);
//     return;
//   }

//   if (getActiveCall()) {
//     const areYouSure = confirm(
//       "You are already in a call. Do you want to hang up and answer this call?"
//     );
//     if (!areYouSure) return;
//     hangup();
//   } else {
//     const areYouSure = confirm("Do you want to answer this call?");
//     if (!areYouSure) return;
//   }

//   cancelAllOutgoingCalls();

//   if (!currentStream) {
//     currentStream = await getStreamByShareType();
//   }
//   gotLocalStream(currentStream);
//   call.answer(currentStream);

//   call.on("stream", handleCallStream);

//   call.on("error", handleCallError);

//   call.on("close", handleCallClose);

//   removeCall(callPeerId);
// }

// function hangup() {
//   const activeCall = getActiveCall();
//   if (activeCall) {
//     activeCall.close();
//   }

//   updateConnectionStatus("idle");
//   gotLocalStream(getStandbyStream());
//   gotRemoteStream(null);

//   if (currentStream) {
//     currentStream.getTracks().forEach((track) => track.stop());
//     currentStream = null;
//   }

//   hangup_btn.disabled = true;

//   closeChatChannel();
//   shareChoice_select.value = "none";
//   validatePeerIdInput();

//   resetFileSharing();
// }

// // stream related functions
// function gotLocalStream(stream) {
//   setLocalVideoStream(stream);
// }

// function gotRemoteStream(stream) {
//   setRemoteVideoStream(stream);
// }

// async function toggleStream() {
//   if (currentStream) {
//     currentStream.getTracks().forEach((track) => track.stop());
//   }

//   currentStream = await getStreamByShareType();
//   gotLocalStream(currentStream);

//   Object.values(peer.connections).forEach((connection) => {
//     connection.forEach((conn) => {
//       if (!conn.peerConnection) return;
//       conn.peerConnection.getSenders().forEach((sender) => {
//         if (!sender.track) return;

//         if (sender.track.kind === "video") {
//           sender.replaceTrack(currentStream.getVideoTracks()[0]);
//         } else if (sender.track.kind === "audio") {
//           sender.replaceTrack(currentStream.getAudioTracks()[0]);
//         }
//       });
//     });
//   });
// }

// async function getUserMediaStream() {
//   const res = await navigator.mediaDevices.getUserMedia({
//     video: true,
//     audio: true,
//   });
//   resetMute();
//   mute_btn.disabled = false;
//   return res;
// }

// async function getDisplayMediaStream() {
//   const res = await navigator.mediaDevices.getDisplayMedia({
//     video: true,
//     audio: true,
//   });
//   resetMute();
//   return res;
// }

// async function getStreamByShareType() {
//   const shareType = shareChoice_select.value;
//   if (shareType === "camera") {
//     return await getUserMediaStream();
//   } else if (shareType === "screen") {
//     return await getDisplayMediaStream();
//   } else if (shareType === "none") {
//     return getStandbyStream();
//   } else {
//     console.error("Invalid share type");
//     return await getUserMediaStream();
//   }
// }

// function getStandbyStream() {
//   resetMute();
//   if (standby_video.mozCaptureStream) {
//     return standby_video.mozCaptureStream();
//   }
//   return standby_video.captureStream();
// }

// function toggleMute() {
//   if (!currentStream) return;
//   const audioTracks = currentStream.getAudioTracks();

//   if (!audioTracks.length > 0) return;
//   const track = audioTracks[0];

//   // Stop the track if muted, otherwise restart it
//   if (isMuted) {
//     track.enabled = true; // Unmute
//   } else {
//     track.enabled = false; // Mute
//   }

//   isMuted = !isMuted;
//   mute_btn.innerText = isMuted ? "Unmute" : "Mute";

//   Object.values(peer.connections).forEach((connection) => {
//     connection.forEach((conn) => {
//       if (!conn.peerConnection) return;
//       conn.peerConnection.getSenders().forEach((sender) => {
//         if (sender.track && sender.track.kind === "audio") {
//           sender.replaceTrack(track);
//         }
//       });
//     });
//   });
// }

// function resetMute() {
//   isMuted = false;
//   mute_btn.innerText = "Mute";
//   mute_btn.disabled = true;
// }

// v: InCommingCoreConnectionRequests related functions
function renderInCommingCoreConnectionRequests() {
  incommingCallsContainer.innerHTML = "";
  const arr = Array.from(inCommingCoreConnectionRequests.values());
  if (arr.length === 0) {
    incommingCallsContainer.innerHTML =
      "<div class='alert alert-info'>No incoming calls at the moment.</div>";
  }
  arr.forEach((call) => {
    const callDiv = document.createElement("div");
    callDiv.innerHTML = `
      <div class="card" style="width: 300px">
        <div class="card-body d-flex flex-column align-items-center">
          <div id="caller-id" class="fw-bold text-center fs-7 mb-3">${call.peer}</div>
          <div class="d-flex gap-2">
            <button
              class="btn btn-success btn-sm"
              id="answer-btn"
              title="Answer"
              onClick="acceptCoreConnectionRequest('${call.peer}')"
            >
              Answer
            </button>
            <button
              class="btn btn-danger btn-sm"
              id="reject-btn"
              title="Reject"
              onClick="rejectCoreConnectionRequest('${call.peer}')"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    `;
    incommingCallsContainer.appendChild(callDiv);
  });
}

function getInCommingCoreConnectionRequest(peerId) {
  return inCommingCoreConnectionRequests.get(peerId);
}

function addInCommingCoreConnectionRequest(call) {
  showPopup("new core connection request from : " + call.peer, "info");
  inCommingCoreConnectionRequests.set(call.peer, call);
  renderInCommingCoreConnectionRequests();
}

function removeInCommingCoreConnectionRequest(peerId) {
  inCommingCoreConnectionRequests.delete(peerId);
  renderInCommingCoreConnectionRequests();
}

// v: OutGoingCoreConnectionRequests related functions
function renderOutGoingCoreConnectionRequests() {
  outgoingCallsContainer.innerHTML = "";
  const arr = Array.from(outGoingCoreConnectionRequests.values());
  if (arr.length === 0) {
    outgoingCallsContainer.innerHTML =
      "<div class='alert alert-info'>No outgoing calls at the moment.</div>";
  }
  arr.forEach((call) => {
    const callDiv = document.createElement("div");
    callDiv.innerHTML = `
      <div class="card" style="width: 300px">
        <div class="card-body d-flex flex-column align-items-center">
          <div id="caller-id" class="fw-bold text-center fs-7 mb-3">${call.peer}</div>
          <div class="d-flex gap-2">
            <button class="btn btn-danger btn-sm" id="cancel-btn" title="Cancel" onClick="cancelOutGoingCoreConnectionRequest('${call.peer}')">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
    outgoingCallsContainer.appendChild(callDiv);
  });
}

function getOutGoingCoreConnectionRequest(peerId) {
  return outGoingCoreConnectionRequests.get(peerId);
}

function addOutGoingCoreConnectionRequest(call) {
  outGoingCoreConnectionRequests.set(call.peer, call);
  renderOutGoingCoreConnectionRequests();
}

function removeOutGoingCoreConnectionRequest(peerId) {
  outGoingCoreConnectionRequests.delete(peerId);
  renderOutGoingCoreConnectionRequests();
}

function cancelOutGoingCoreConnectionRequest(peerId) {
  const call = getOutGoingCoreConnectionRequest(peerId);
  call.send({ type: "connection-aborted" });
  call.close();
  removeOutGoingCoreConnectionRequest(peerId);
}

// Call related functions
// function getActiveCall() {
//   // Loop through all connections
//   for (const [peerId, connections] of Object.entries(peer.connections)) {
//     for (const conn of connections) {
//       // Check if the connection is a call and if it has an active stream
//       if (conn.peerConnection) {
//         const senders = conn.peerConnection.getSenders();
//         for (const sender of senders) {
//           if (sender.track && sender.track.kind === "video") {
//             return conn; // Return the active call
//           }
//         }
//       }
//     }
//   }
//   return null;
// }

// function cancelAllOutgoingCalls() {
//   for (const call of outgoingCalls.values()) {
//     call.close();
//   }
//   outgoingCalls.clear();
//   renderCalls();
// }

// function handleChannelData(data) {
//   switch (data.type) {
//     case "chat-message":
//       pushChatMessage(data.message, false);
//       break;
//     case "file":
//       receiveFile(data.file, data.fileName);
//       break;
//     default:
//       console.log("Unknown message type", data);
//   }
// }

// // file related functions
// function sendFile() {
//   const file = fileInput.files[0];
//   if (!file) return;

//   const reader = new FileReader();
//   reader.onload = () => {
//     chatChannel.send({
//       type: "file",
//       file: reader.result,
//       fileName: file.name,
//     });
//   };
//   reader.readAsArrayBuffer(file);
//   // clear the input
//   fileInput.value = null;
// }

// function receiveFile(file, fileName) {
//   const blob = new Blob([file]);
//   const url = URL.createObjectURL(blob);
//   addFileToList(url, fileName);
// }

// function resetFileSharing() {
//   sendFile_btn.disabled = true;
//   fileInput.disabled = true;
//   clearFileList();
// }

// function turnOnFileSharing() {
//   sendFile_btn.disabled = false;
//   fileInput.disabled = false;
// }

// // Chat related functions
// function setupChatChannel(chatChannel) {
//   chatChannel.on("open", () => {
//     console.log("Chat channel open");
//     sendMessage_btn.disabled = false;
//     chatMessage_input.disabled = false;

//     chatChannel.on("data", handleChannelData);

//     chatChannel.on("close", () => {
//       closeChatChannel();
//     });

//     chatChannel.on("error", (err) => {
//       console.log("Chat error", err);
//     });
//   });
// }

// function closeChatChannel() {
//   if (chatChannel) {
//     chatChannel.close();
//   }
//   clearChatMessages();
//   // disable chat input and btn
//   sendMessage_btn.disabled = true;
//   chatMessage_input.disabled = true;
// }

// function resetChatMessages() {
//   clearChatMessages();
//   sendMessage_btn.disabled = true;
//   chatMessage_input.disabled = true;
// }
