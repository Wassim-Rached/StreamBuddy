const alertsContainer = document.getElementById("alerts-container");
const copy_btn = document.getElementById("copy-btn");
const connectionStatus = document.getElementById("connection-status");
const chatBox = document.getElementById("chat-box");
const isTypingIndicator = document.getElementById("is-typing-indicator");

function showPopup(message, type) {
  new Noty({
    type: type,
    layout: "bottomRight",
    text: message,
    timeout: 3000,
  }).show();
}

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

  if (byMe) {
    chatMessageInput.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

let isTypingTimeout;
function renderIsTyping(renderForSeconds) {
  isTypingIndicator.style.display = "block";
  clearTimeout(isTypingTimeout);
  isTypingTimeout = setTimeout(() => {
    clearIsTyping();
  }, renderForSeconds * 1000);
}

function clearIsTyping() {
  isTypingIndicator.style.display = "none";
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
  if (!peerIdInput.value || peerIdInput.value === "") {
    call_btn.disabled = true;
    return;
  }

  console.log(peer && peer.id && peer.id == peerIdInput.value);

  if (peer && peer.id && peer.id == peerIdInput.value) {
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
    .writeText(myIdInput.value)
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

// video related functions

// function toggleFullScreen(videoId) {
//   const videoElement = document.getElementById(videoId);
//   const button = videoElement.nextElementSibling;

//   if (!document.fullscreenElement) {
//     if (videoElement.requestFullscreen) {
//       videoElement.requestFullscreen();
//     } else if (videoElement.mozRequestFullScreen) {
//       // Firefox
//       videoElement.mozRequestFullScreen();
//     } else if (videoElement.webkitRequestFullscreen) {
//       // Chrome, Safari and Opera
//       videoElement.webkitRequestFullscreen();
//     } else if (videoElement.msRequestFullscreen) {
//       // IE/Edge
//       videoElement.msRequestFullscreen();
//     }
//     button.textContent = "Exit Full Screen";
//   } else {
//     if (document.exitFullscreen) {
//       document.exitFullscreen();
//     } else if (document.mozCancelFullScreen) {
//       // Firefox
//       document.mozCancelFullScreen();
//     } else if (document.webkitExitFullscreen) {
//       // Chrome, Safari and Opera
//       document.webkitExitFullscreen();
//     } else if (document.msExitFullscreen) {
//       // IE/Edge
//       document.msExitFullscreen();
//     }
//     button.textContent = "Full Screen";
//   }
// }

//
