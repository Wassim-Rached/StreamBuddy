const alertsContainer = document.getElementById("alerts-container");
const copy_btn = document.getElementById("copy-btn");
const connectionStatus = document.getElementById("connection-status");
const chatBox = document.getElementById("chat-box");

function pushChatMessage(message, byMe = false) {
  if (!message || message.trim() === "") return;

  // Create a div element for the chat message
  const chatMessage = document.createElement("div");
  chatMessage.className = `chat-message ${byMe ? "me" : "other"}`;

  // Create a div element for the chat message content
  const chatMessageContent = document.createElement("div");
  chatMessageContent.className = "chat-message-content";
  chatMessageContent.textContent = message;

  // Append the content to the message div
  chatMessage.appendChild(chatMessageContent);

  // Append the message div to the chat box
  chatBox.appendChild(chatMessage);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (byMe) {
    chatMessage_input.value = "";
  }
}

function clearChatMessages() {
  chatBox.innerHTML = "";
}

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
