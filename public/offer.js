// var socket = io.connect("http://localhost:3000");
window.onload = function(e) {
  var socket = io.connect(location.host);

  var answersFrom = [],
    offer;
  var peerConnection =
    window.RTCPeerConnection ||
    window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection ||
    window.msRTCPeerConnection;

  var sessionDescription =
    window.RTCSessionDescription ||
    window.mozRTCSessionDescription ||
    window.webkitRTCSessionDescription ||
    window.msRTCSessionDescription;

  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;

  var pc = new peerConnection({
    iceServers: [
      {
        url: "stun:stun.services.mozilla.com",
        username: "somename",
        credential: "somecredentials"
      }
    ]
  });

  var localStream = null;

  var makeACall = document.querySelector("#make-a-call-div");
  var waitingDiv = document.querySelector("#waiting-div");
  var icons = document.querySelector("#icons");
  var hangup = document.querySelector("#hangup");
  pc.onaddstream = function(obj) {
    var oldRemoteVideo = document.getElementById("remote-video");
    if (oldRemoteVideo) {
      oldRemoteVideo.remove();
    }
    var vid = document.createElement("video");
    vid.setAttribute("class", "active");
    vid.setAttribute("autoplay", "autoplay");
    vid.setAttribute("id", "remote-video");
    document.getElementById("videos").appendChild(vid);
    vid.srcObject = obj.stream;
    // console.log("vid", vid, obj.stream);
  };

  pc.onconnectionstatechange = event => {
    console.log("connection change", event.currentTarget.connectionState);
  };

  navigator.getUserMedia(
    { video: true, audio: true },
    function(stream) {
      // asgn to localStream

      localStream = stream;
      var video = document.querySelector("#mini-video");
      video.setAttribute("class", "active");
      video.srcObject = stream;
      if (pc) {
        pc.addStream(stream);
      }
    },
    error
  );

  socket.on("connect", () => {
    socket.emit("get-users");
  });

  socket.on("room-full", () => {
    console.log("Room is full");
    pc.close();
  });

  socket.on("room-available", id => {
    makeACall.setAttribute("class", "active");
    makeACall.addEventListener("click", () => {
      // console.log("connectionState",pc.connectionState)
      createOffer(id); // chinh la socket id cua minh
    });
  });

  socket.on("remove-user", function(id) {
    // Remove video
    var oldRemoteVideo = document.getElementById("remote-video");
    if (oldRemoteVideo) oldRemoteVideo.remove();

    // remove
    resetState();
  });

  socket.on("answer-made", function(data) {
    // console.log("answer-made", data, pc.currentLocalDescription);
    pc.setRemoteDescription(
      new sessionDescription(data.answer),
      function() {
        //   document.getElementById(data.socket).setAttribute("class", "active");
        if (!answersFrom[data.socket]) {
          createOffer(data.socket);
          answersFrom[data.socket] = true;
        }
        icons.setAttribute("class", "active");
        hangup.setAttribute("class", "active");
        hangup.addEventListener("click", hangupFnc);
      },
      error
    );
  });

  function createOffer(id) {
    //
    makeACall.setAttribute("class", "hidden"); //
    pc.createOffer(function(offer) {
      // console.log("offer", offer);
      pc.setLocalDescription(
        new sessionDescription(offer),
        function() {
          socket.emit("make-offer", {
            offer: offer,
            to: id
          });
          waitingDiv.setAttribute("class", "active");
        },
        error
      );
    }, error);
  }

  function error(err) {
    console.warn("Error", err);
  }
  // hangup
  var hangupFnc = () => {
    if (localStream) {
      if (typeof localStream.getTracks === "undefined") {
        localStream.stop();
      } else {
        localStream.getTracks().forEach(function(track) {
          track.stop();
        });
      }
      localStream = null;
    }
    if (pc) {
      pc.close();
      pc = null;
    }
    socket.disconnect();
    // trick

    window.location.reload();
  };

  var toggleVideoMute = () => {
    var videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.log("No local video available.");
      return;
    }

    console.log("Toggling video mute state.");
    for (var i = 0; i < videoTracks.length; ++i) {
      videoTracks[i].enabled = !videoTracks[i].enabled;
    }
    console.log("Video " + (videoTracks[0].enabled ? "unmuted." : "muted."));
    if (muteVideo) {
      muteVideo.setAttribute("class", videoTracks[0].enabled ? "off" : "on");
    }
  };

  var toggleAudioMute = () => {
    var audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log("No local audio available.");
      return;
    }

    console.log("Toggling audio mute state.");
    for (var i = 0; i < audioTracks.length; ++i) {
      audioTracks[i].enabled = !audioTracks[i].enabled;
    }
    console.log("Audio " + (audioTracks[0].enabled ? "unmuted." : "muted."));
    if (muteAudio) {
      muteAudio.setAttribute("class", audioTracks[0].enabled ? "off" : "on");
    }
  };

  var toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  function resetState() {
    makeACall.setAttribute("class", "active");
    waitingDiv.setAttribute("class", "hidden");
    icons.setAttribute("class", "hidden");
    hangup.setAttribute("class", "hidden");
  }

  var fullscreen = document.querySelector("#fullscreen");
  var muteVideo = document.querySelector("#mute-video");
  var muteAudio = document.querySelector("#mute-audio");

  fullscreen.addEventListener("click", toggleFullscreen);
  muteAudio.addEventListener("click", toggleAudioMute);
  muteVideo.addEventListener("click", toggleVideoMute);
};
