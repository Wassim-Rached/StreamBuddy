document.addEventListener("DOMContentLoaded", () => {
  let _remoteVideo_ = new Plyr("#remote-video", {
    controls: ["volume", "fullscreen"],
  });
  let _localVideo_ = new Plyr("#local-video", {
    controls: [],
  });
});