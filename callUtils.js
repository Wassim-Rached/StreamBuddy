const audioDeviceOption = document.getElementById("audioDeviceOption");

document.addEventListener("DOMContentLoaded", async () => {
  await renderAudioDevices();
  navigator.mediaDevices.ondevicechange = renderAudioDevices;
});

// event listener to get audio devices

async function getAudioDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "audiooutput");
}

// function to update audio devices
async function renderAudioDevices() {
  const devices = await getAudioDevices();
  audioDeviceOption.innerHTML = "";
  devices.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.text = device.label;
    audioDeviceOption.appendChild(option);
  });
}
