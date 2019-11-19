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
        // url: "stun:stun.services.mozilla.com",
        url: "stun:stun.l.google.com:19302"
        // username: "somename",
        // credential: "somecredentials"
      }
    ]
  });

  var localStream = null;

  var makeACall = document.querySelector("#make-a-call-div");
  var waitingDiv = document.querySelector("#waiting-div");
  var icons = document.querySelector("#icons");
  var hangup = document.querySelector("#hangup");
  const filterIceCandidate = candidateObj => {
    var candidateStr = candidateObj.candidate;

    // Always eat TCP candidates. Not needed in this context.
    if (candidateStr.indexOf("tcp") !== -1) {
      return false;
    }

    return true;
  };
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
    console.log("connection change", pc.iceConnectionState);
  };

  pc.onicecandidate = ev => {
    // console.log("sss", pc.iceConnectionState);
    if (ev.candidate) {
      // Send the candidate to the remote peer
      if (filterIceCandidate(ev.candidate)) {
        var message = {
          room: "phet",
          candidate: ev.candidate
        };
        socket.emit("make-candidate", message);
      }
    } else {
      // All ICE candidates have been sent
    }
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
    socket.emit("room", "phet");
  });

  socket.on("full", () => {
    console.log("Room is full");
    pc.close();
  });

  socket.on("joined", room => {
    makeACall.setAttribute("class", "active");
    makeACall.addEventListener("click", () => {
      // console.log("connectionState",pc.connectionState)
      createOffer(room); // chinh la socket id cua minh
    });
  });

  socket.on("remove-user", function(id) {
    // Remove video
    var oldRemoteVideo = document.getElementById("remote-video");
    if (oldRemoteVideo) oldRemoteVideo.remove();

    // remove
    resetState();
  });

  socket.on("answer-made", data => {
    // console.log("answer-made", data, pc.currentLocalDescription);
    pc.setRemoteDescription(
      new sessionDescription(data.answer),
      function() {
        //   document.getElementById(data.socket).setAttribute("class", "active");
        // if (!answersFrom[data.room]) {
        //   createOffer(data.room);
        //   answersFrom[data.room] = true;
        // }
        icons.setAttribute("class", "active");
        hangup.setAttribute("class", "active");
        hangup.addEventListener("click", hangupFnc);
      },
      error
    );
  });

  socket.on("candidate", async message => {
    try {
      const candidate = new RTCIceCandidate(message.candidate);
      // const candidate = new RTCIceCandidate(message.candidate);
      await pc.addIceCandidate(candidate);
      console.log("Remote candidate added successfully.");
    } catch (error) {
      console.log("Remote candidate added failed.", error);
    }
  });

  socket.on("disconnect", () => {
    try {
      socket.emit("leave", "phet");
    } catch (error) {
      console.log("leave error: ", error);
    }
  });

  function createOffer(room) {
    //
    makeACall.setAttribute("class", "hidden"); //
    pc.createOffer(offer => {
      // console.log("offer", offer);
      const data = {
        offer: offer,
        room: room
      };
      pc.setLocalDescription(
        new sessionDescription(offer),
        function() {
          socket.emit("make-offer", data);
          // console.log("Data", data);
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
