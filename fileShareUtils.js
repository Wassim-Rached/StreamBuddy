const fileList = document.getElementById("file-list");
const reciverFileProgressContainer = document.getElementById(
  "reciver-file-progress"
);
const senderFileProgressContainer = document.getElementById(
  "sender-file-progress"
);
const incommingFileRequestsContainer = document.getElementById(
  "incomming-file-requests-container"
);
const outgoingFileRequestsContainer = document.getElementById(
  "outgoing-file-requests-container"
);

// incomming file requests related functions
function addIncommingFileRequestToHtmlList(fileName, totalSize, transferId) {
  const id = "incomming-file-request-" + transferId;
  const fileRequest = document.createElement("div");
  fileRequest.id = id;
  fileRequest.className = "file-request card mb-3";
  fileRequest.innerHTML = `
    <div class="card-body d-flex justify-content-between align-items-center">
      <div>
        <h5 class="card-title mb-0">${fileName}</h5>
        <p class="card-text">${formatBytes(totalSize)}</p>
      </div>
      <div>
        <button class="btn btn-success btn-sm mr-2" onclick="acceptFileTransferRequest('${transferId}')">Accept</button>
        <button class="btn btn-danger btn-sm" onclick="rejectFileTransferRequest('${transferId}')">Reject</button>
      </div>
    </div>
  `;
  const alert = incommingFileRequestsContainer.querySelector(".alert");
  if (alert) {
    alert.remove();
  }

  incommingFileRequestsContainer.appendChild(fileRequest);
}

function removeIncommingFileRequestFromHtmlList(transferId) {
  const fileRequest = document.getElementById(
    "incomming-file-request-" + transferId
  );
  if (fileRequest) {
    fileRequest.remove();
  }
}

function emptyIncommingFileRequestsContainer() {
  incommingFileRequestsContainer.innerHTML = "";
}

// outgoing file requests related functions
function addOutgoingFileRequestToHtmlList(fileName, totalSize, transferId) {
  const id = "outgoing-file-request-" + transferId;
  const fileRequest = document.createElement("div");
  fileRequest.id = id;
  fileRequest.className = "file-request card mb-3";
  fileRequest.innerHTML = `
    <div class="card-body d-flex justify-content-between align-items-center">
      <div>
        <h5 class="card-title mb-0">${fileName}</h5>
        <p class="card-text">${formatBytes(totalSize)}</p>
      </div>
      <div>
        <button class="btn btn-danger btn-sm" onclick="cancelFileTransferRequest('${transferId}')">Cancel</button>
      </div>
    </div>
  `;
  const alert = outgoingFileRequestsContainer.querySelector(".alert");
  if (alert) {
    alert.remove();
  }

  outgoingFileRequestsContainer.appendChild(fileRequest);
}

function removeOutgoingFileRequestFromHtmlList(transferId) {
  const fileRequest = document.getElementById(
    "outgoing-file-request-" + transferId
  );
  if (fileRequest) fileRequest.remove();
}

function emptyOutgoingFileRequestsContainer() {
  outgoingFileRequestsContainer.innerHTML = "";
}

// file download related functions
function addFileToDownloadList(url, fileName, totalSize) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.textContent = fileName + " - " + formatBytes(totalSize);
  fileList.appendChild(link);
}

function clearFileDownloadList() {
  fileList.innerHTML = "";
}

// file progress related functions
const progressBars = new Map();
function addFileProgressBar(transferId, fileName, totalSize, asSender) {
  const fileProgressItem = document.createElement("div");
  fileProgressItem.className = "file-progress-item";
  const p = document.createElement("p");
  p.textContent = fileName + " - " + formatBytes(totalSize);

  const progressBar = document.createElement("div");
  progressBar.id = `progress-bar-${transferId}`;
  progressBar.className = "progress-bar";
  progressBar.role = "progressbar";
  progressBar.style.width = "0%";
  progressBar.textContent = `${fileName} - 0%`;

  const progressContainer = document.createElement("div");
  progressContainer.className = "progress mb-3";
  progressContainer.appendChild(progressBar);

  fileProgressItem.appendChild(p);
  fileProgressItem.appendChild(progressContainer);
  if (asSender) {
    senderFileProgressContainer.appendChild(fileProgressItem);
  } else {
    reciverFileProgressContainer.appendChild(fileProgressItem);
  }

  // Add progress bar to the map
  progressBars.set(transferId, progressBar);
}

function updateFileProgress(transferId, progress) {
  const progressBar = progressBars.get(transferId);
  progressBar.style.width = `${progress}%`;
  progressBar.textContent = `${progress}%`;
}

function removeFileProgressBar(transferId) {
  const progressBar = progressBars.get(transferId);
  progressBar.parentElement.parentElement.remove();
  progressBars.delete(transferId);
}

function setFileProgressWaitingForConfirmation(transferId) {
  setTimeout(() => {
    const progressBar = progressBars.get(transferId);
    progressBar.style.width = "100%";
    progressBar.textContent = "Waiting for confirmation...";
  }, 1000);
}

function setFileProgressDelivrered(transferId) {
  setTimeout(() => {
    const progressBar = progressBars.get(transferId);
    progressBar.style.width = "100%";
    progressBar.classList.add("bg-success");
    progressBar.textContent = "Delivered!";
  }, 1000);
}

function clearFileProgressBars() {
  reciverFileProgressContainer.innerHTML = "";
  senderFileProgressContainer.innerHTML = "";
}

// general functions
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
