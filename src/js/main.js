const FILE_SHARE_CHUNK_SIZE = 16 * 1024; // 16 KB

const incommingCallsContainer = document.getElementById(
  "incomming-calls-container"
);
const outgoingCallsContainer = document.getElementById(
  "outgoing-calls-container"
);

// inputs
const peerIdInput = document.getElementById("peer-id");
const myIdInput = document.getElementById("my-id");
const chatMessageInput = document.getElementById("chat-message-input");
const fileInput = document.getElementById("file-input");

// buttons
const hangupBtn = document.getElementById("hangup-btn");
const sendMessageBtn = document.getElementById("send-message-btn");
const sendFileBtn = document.getElementById("send-file-btn");
const connectBtn = document.getElementById("connect-btn");

peerIdInput.addEventListener("input", validatePeerIdInput);
chatMessageInput.addEventListener("keydown", handleChatMessageKeyDown);
sendMessageBtn.addEventListener("click", sendChatMessage);

const coreConnectionEstablishedSuccessfullyEvent = new CustomEvent(
  "coreConnectionEstablishedSuccessfully"
);
const coreConnectionHangupEvent = new CustomEvent("coreConnectionHangup");

// varibles
let __amITheSender = undefined; //
let peer; // represents the current user

let coreConnection; // used to connect both clients
let voiceCall; // used for the voice data exchange
let videoCall; // used for the video data exchange
let chatConnection; // used for the chat data exchange
let fileConnection; // used for the file data exchange

let outGoingCoreConnectionRequests = new Map();
let inCommingCoreConnectionRequests = new Map();

let incomingCalls; // represents the incoming calls list
let outgoingCalls; // represents the outgoing calls list

// event listeners
window.addEventListener("load", init);
hangupBtn.addEventListener("click", closeCoreConnection);
sendFileBtn.addEventListener("click", sendFileRequest);
chatMessageInput.addEventListener("input", sendIsTyping);
connectBtn.addEventListener("click", (e) =>
  sendCoreConnectionRequest(getOtherPeerId())
);

// helpers
function getAmiTheSender() {
  if (__amITheSender === undefined) {
    console.error("amITheSender is not set");
  }
  return __amITheSender;
}

function setAmITheSender(value) {
  __amITheSender = value;
}

function getOtherPeerId() {
  return peerIdInput.value;
}

function validatePeerIdInput() {
  if (
    peerIdInput.value.trim() === "" ||
    peerIdInput.value === myIdInput.value
  ) {
    connectBtn.disabled = true;
  } else {
    connectBtn.disabled = false;
  }
}

function handleChatMessageKeyDown(e) {
  if (e.key === "Enter") {
    sendMessageBtn.click();
  }
}

// window events
window.addEventListener(
  "coreConnectionEstablishedSuccessfully",
  onCoreConnectionEstablishedSuccessfully
);
window.addEventListener("coreConnectionHangup", onCoreConnectionHangup);
window.addEventListener("updatePeerConnectionWithNewAudioTrack", () => {
  if (!voiceCall) return;
  console.log("Updating peer connection with new audio track");
  updatePeerConnectionWithNewAudioTrack(voiceCall.peerConnection);
});
window.addEventListener("updatePeerConnectionWithNewVideoTrack", () => {
  if (!videoCall) return;
  console.log("Updating peer connection with new video track");
  updatePeerConnectionWithNewVideoTrack(videoCall.peerConnection);
});

// core logic functions
async function onCoreConnectionEstablishedSuccessfully() {
  showPopup("Core connection established successfully", "success");
  peerIdInput.value = coreConnection.peer;
  connectBtn.disabled = true;
  hangupBtn.disabled = false;
  updateConnectionStatus("Connected");

  if (getAmiTheSender()) {
    console.log("i am the sender");
    // voice related
    const localAudioStream = await getDestinationStream();
    voiceCall = peer.call(coreConnection.peer, localAudioStream, {
      metadata: { type: "voice" },
    });
    setupVoiceCall(voiceCall);

    // video related
    const localVideoStream = await getLocalVideoStream();
    videoCall = peer.call(coreConnection.peer, localVideoStream, {
      metadata: { type: "video" },
    });
    setupVideoCall(videoCall);

    // chat related
    chatConnection = peer.connect(coreConnection.peer, {
      metadata: { type: "chat" },
    });
    setupChatConnection(chatConnection);

    // file sharing related
    fileConnection = peer.connect(coreConnection.peer, {
      metadata: { type: "file" },
    });
    setupFileConnection(fileConnection);
  } else {
    console.log("i am the reciver");
  }
}

function onCoreConnectionHangup() {
  showPopup("Core connection hangup successfully", "info");
  connectBtn.disabled = false;
  hangupBtn.disabled = true;
  updateConnectionStatus("idle");

  // voice related
  closeVoiceCall();

  // video related
  closeVideoCall();

  // chat related
  closeChatConnection();

  // file sharing related
  closeFileConnection();
}

async function init() {
  myIdInput.value = "";
  peerIdInput.value = "";
  connectBtn.disabled = true;
  peer = new Peer();
  incomingCalls = new Map();
  outgoingCalls = new Map();

  // voice related
  audioCheckbox.checked = false;

  peer.on("open", handlePeerConnectionOpen);

  peer.on("call", handlePeerConnectionCall);

  peer.on("connection", handlePeerConnectionConnection);

  resetFileSharing();
  resetChatMessages();
  peerIdInput.value = "";
}

// peer related functions
function handlePeerConnectionOpen(id) {
  myIdInput.value = id;
}

function handlePeerConnectionCall(call) {
  switch (call.metadata.type) {
    case "voice":
      console.log("Voice call received with metadata");
      voiceCall = call;
      setupVoiceCall(call);
      break;
    case "video":
      console.log("Video call received with metadata");
      videoCall = call;
      setupVideoCall(call);
      break;
    default:
      console.error("Unknown connection type", conn.metadata.type);
  }
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
    case "chat":
      chatConnection = conn;
      setupChatConnection(chatConnection);
      break;
    case "file":
      fileConnection = conn;
      setupFileConnection(fileConnection);
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
        setAmITheSender(true);
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
  setAmITheSender(false);
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

/*
  Start v: InCommingCoreConnectionRequests related functions
*/
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
/*
  End v: InCommingCoreConnectionRequests related functions
*/

/*
  Start v: OutGoingCoreConnectionRequests related functions
*/
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
/*
  End v: OutGoingCoreConnectionRequests related functions
*/

/*
  Start : Voice related functions
*/
async function setupVoiceCall(call) {
  const localAudioStream = await getDestinationStream();
  call.answer(localAudioStream);

  call.on("stream", handleVoiceCallStream);
  call.on("error", handleVoiceCallError);
  call.on("close", handleVoiceCallClose);
}

async function handleVoiceCallStream(stream) {
  setRemoteAudioStream(stream);
  renderRemoteAudioStream();
  visualizeAudioStream(stream, "remote-stream-canvas");
}

function handleVoiceCallError(err) {
  console.error(err);
}

function handleVoiceCallClose() {
  console.log("Voice call closed");

  voiceCall = undefined;
}

function closeVoiceCall() {
  if (voiceCall && voiceCall.open) {
    voiceCall.close();
  }
}

/*  
  End : Voice related functions
*/

/*
  Start : Video related functions
*/
async function setupVideoCall(call) {
  const localVideoStream = await getLocalVideoStream();
  call.answer(localVideoStream);

  call.on("stream", handleVideoCallStream);
  call.on("error", handleVideoCallError);
  call.on("close", handleVideoCallClose);
}

function handleVideoCallStream(stream) {
  console.log("Video call stream received");
  const remoteVideo = document.getElementById("remote-video");
  remoteVideo.srcObject = stream;
}
function handleVideoCallError(err) {
  console.error(err);
}
function handleVideoCallClose() {
  console.log("Video call closed");

  videoCall = undefined;
}
function closeVideoCall() {
  if (videoCall && videoCall.open) {
    videoCall.close();
  }
}

/*
  End : Video related functions
*/

/*
  Start : File sharing related functions
*/
function setupFileConnection(conn) {
  conn.on("open", () => {
    sendFileBtn.disabled = false;
    fileInput.disabled = false;

    conn.on("data", handleFileConnectionData);
    conn.on("close", handleFileConnectionClose);
    conn.on("error", (err) => console.error(err));
  });
}

function handleFileConnectionData(data) {
  switch (data.type) {
    case "file":
      handleFileTransfer(data.data);
      break;
    case "file-request":
      handleFileRequest(data);
      break;
    case "file-response":
      handleFileResponse(data);
      break;
    case "cancel-file-request":
      handleCancelFileRequest(data);
      break;
    case "file-delivered":
      handleFileDelivered(data);
      break;
    default:
      console.error("Unknown message type", data.type);
  }
}

function handleFileConnectionClose() {
  console.log("File connection closed");

  fileConnection = undefined;
  resetFileSharing();
}

const fileTransfers = new Map(); // used to handle multiple file transfers at the same time
function handleFileTransfer({
  file,
  fileName,
  currentChunk,
  totalChunks,
  transferId,
}) {
  // reciver function
  if (!fileTransfers.has(transferId)) {
    fileTransfers.set(transferId, {
      chunks: [],
      totalChunks,
      fileName,
      receivedChunks: 0,
    });
    const totalSize = totalChunks * FILE_SHARE_CHUNK_SIZE;
    addFileProgressBar(transferId, fileName, totalSize, false);
  }

  const transfer = fileTransfers.get(transferId);
  transfer.chunks[currentChunk] = file;
  transfer.receivedChunks++;

  const progress = Math.floor((transfer.receivedChunks / totalChunks) * 100);
  updateFileProgress(transferId, progress);

  if (transfer.receivedChunks === transfer.totalChunks) {
    const blob = new Blob(transfer.chunks);
    const url = URL.createObjectURL(blob);
    const totalSize = totalChunks * FILE_SHARE_CHUNK_SIZE;
    addFileToDownloadList(url, transfer.fileName, totalSize);
    showPopup("New file received: " + transfer.fileName, "info");
    fileTransfers.delete(transferId);
    removeFileProgressBar(transferId);
    fileConnection.send({
      type: "file-delivered",
      transferId,
    });
  }
}

const incomingFileRequests = new Map(); // used to persist primary info about the file for the reciver
function handleFileRequest({ fileName, size, transferId }) {
  // reciver function
  showPopup("New file request: " + fileName, "info");
  incomingFileRequests.set(transferId, { fileName, size });
  addIncommingFileRequestToHtmlList(fileName, size, transferId);
}

function handleFileResponse({ response, transferId }) {
  // sender function
  const isAccepted = response === "accepted";
  if (isAccepted) {
    const file = waitingFileRequests.get(transferId);
    if (!file) {
      showPopup("File Not Found", "error");
      return;
    }
    waitingFileRequests.delete(transferId);
    startSendingFile(file);
    removeOutgoingFileRequestFromHtmlList(transferId);
    showPopup("File transfer accepted", "success");
  } else {
    removeOutgoingFileRequestFromHtmlList(transferId);
    waitingFileRequests.delete(transferId);
    showPopup("File transfer rejected", "error");
  }
}

function handleCancelFileRequest({ transferId }) {
  // reciver function
  const file = incomingFileRequests.get(transferId);
  showPopup("File transfer request cancelled for : " + file.fileName, "error");
  incomingFileRequests.delete(transferId);
  removeIncommingFileRequestFromHtmlList(transferId);
}

function handleFileDelivered({ transferId }) {
  // sender function
  setFileProgressDelivrered(transferId);
}

function acceptFileTransferRequest(transferId) {
  // reciver function
  fileConnection.send({
    type: "file-response",
    response: "accepted",
    transferId,
  });
  showPopup("File transfer accepted", "success");
  removeIncommingFileRequestFromHtmlList(transferId);
}

function rejectFileTransferRequest(transferId) {
  // reciver function
  fileConnection.send({
    type: "file-response",
    response: "rejected",
    transferId,
  });
  showPopup("File transfer rejected", "error");
  removeIncommingFileRequestFromHtmlList(transferId);
}

function cancelFileTransferRequest(transferId) {
  // sender function
  fileConnection.send({
    type: "cancel-file-request",
    transferId,
  });
  waitingFileRequests.delete(transferId);
  removeOutgoingFileRequestFromHtmlList(transferId);
}

const waitingFileRequests = new Map();
function sendFileRequest() {
  // sender function
  const file = fileInput.files[0];
  const transferId = String(Date.now());
  if (!file) return;
  fileConnection.send({
    type: "file-request",
    fileName: file.name,
    size: file.size,
    transferId: transferId,
  });
  waitingFileRequests.set(transferId, file);
  clearFileInput();
  addOutgoingFileRequestToHtmlList(file.name, file.size, transferId);
}

function startSendingFile(file) {
  // sender function
  if (!file) return;

  const transferId = Date.now(); // Unique ID for each transfer
  const chunkSize = FILE_SHARE_CHUNK_SIZE;
  const totalChunks = Math.ceil(file.size / chunkSize);
  let currentChunk = 0;
  addFileProgressBar(transferId, file.name, file.size, true);

  const reader = new FileReader();
  reader.onload = () => {
    if (!fileConnection) return;
    fileConnection.send({
      type: "file",
      data: {
        file: reader.result,
        fileName: file.name,
        currentChunk,
        totalChunks,
        transferId,
      },
    });

    currentChunk++;
    const progress = Math.floor((currentChunk / totalChunks) * 100);
    updateFileProgress(transferId, progress);

    if (currentChunk < totalChunks) {
      readNextChunk();
    } else {
      // called when all chunks are sent
      setFileProgressWaitingForConfirmation(transferId);
      clearFileInput();
    }
  };

  const readNextChunk = () => {
    const start = currentChunk * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);
    reader.readAsArrayBuffer(blob);
  };

  readNextChunk();
}

function resetFileSharing() {
  sendFileBtn.disabled = true;
  fileInput.disabled = true;
  // clearFileDownloadList();
  clearFileInput();
  fileTransfers.clear();
  incomingFileRequests.clear();
  waitingFileRequests.clear();
  emptyOutgoingFileRequestsContainer();
  emptyIncommingFileRequestsContainer();
  clearFileProgressBars();
}

function clearFileInput() {
  fileInput.value = null;
}

function closeFileConnection() {
  if (fileConnection && fileConnection.open) {
    fileConnection.close();
  }
}
/*
  End : File sharing related functions
*/

/*
  Start : Chat related functions
*/
function setupChatConnection(conn) {
  conn.on("open", () => {
    sendMessageBtn.disabled = false;
    chatMessageInput.disabled = false;

    conn.on("data", handleChatConnectionData);

    conn.on("close", handleChatConnectionClose);

    conn.on("error", (err) => console.error(err));
  });
}

function handleChatConnectionData(data) {
  switch (data.type) {
    case "chat-message":
      clearIsTyping();
      pushChatMessage(data.message, false);
      break;
    case "is-typing":
      handleIsTyping(data);
      break;
    default:
      console.error("Unknown message type", data.type);
  }
}

function handleChatConnectionClose() {
  console.log("Chat connection closed");

  chatConnection = undefined;
  resetChatMessages();
}

function sendChatMessage() {
  const message = chatMessageInput.value;
  if (!message || message.trim() === "") return;
  chatConnection.send({
    type: "chat-message",
    message: message,
  });
  pushChatMessage(message, true);
}

function handleIsTyping(data) {
  renderIsTyping(1);
}

function sendIsTyping() {
  chatConnection.send({
    type: "is-typing",
  });
}

function resetChatMessages() {
  clearChatMessages();
  sendMessageBtn.disabled = true;
  chatMessageInput.value = "";
  chatMessageInput.disabled = true;
}

function closeChatConnection() {
  if (chatConnection && chatConnection.open) {
    chatConnection.close();
  }
}
