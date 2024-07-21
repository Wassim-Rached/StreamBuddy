const alertsContainer = document.getElementById("alerts-container");
const copy_btn = document.getElementById("copy-btn");
const connectionStatus = document.getElementById("connection-status");

function pushAlert(message, type = "info") {
  const bootstrapAlert = `
	  <div class="alert alert-${type} alert-dismissible fade show fs-7" role="alert">
		${message}
	  </div>
	`;
  alertsContainer.innerHTML += bootstrapAlert;
  setTimeout(() => {
    const lastAlert = alertsContainer.lastElementChild;
    if (lastAlert) {
      lastAlert.remove();
    }
  }, 5000);
}

function validatePeerIdInput() {
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

copy_btn.addEventListener("click", () => {
  navigator.clipboard
    .writeText(myId_input.value)
    .then(() => {
      copy_btn.innerText = "Copied!";
      setTimeout(() => {
        copy_btn.innerText = "Copy Link";
      }, 2000);
    })
    .catch((err) => {
      console.log("Error copying text: ", err);
    });
});
