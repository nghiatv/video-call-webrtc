// var socket = io.connect("http://localhost:3000");
window.onload = function(e) {
  var socket = io.connect(location.host);

  var answersFrom = {},
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
    console.log("vid", vid, obj.stream);
  };

  navigator.getUserMedia(
    { video: true, audio: true },
    function(stream) {
      var video = document.querySelector("#mini-video");
      video.setAttribute("class", "active");
      video.srcObject = stream;
      if (pc) {
        console.log("Added stream", stream);
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
  });

  socket.on("room-available", id => {
    makeACall.setAttribute("class", "active");
    makeACall.addEventListener("click", () => {
      createOffer(id); // chinh la socket id cua minh
    });
  });

  socket.on("remove-user", function(id) {
    // Remove video
    var oldRemoteVideo = document.getElementById("remote-video");
    if (oldRemoteVideo) oldRemoteVideo.remove();

    // remove
    // sharingDiv.setAttribute("class", "active");
  });

  // socket.on("offer-made", function(data) {
  //   offer = data.offer;
  //   pc.setRemoteDescription(
  //     new sessionDescription(data.offer),
  //     function() {
  //       pc.createAnswer(function(answer) {
  //         pc.setLocalDescription(
  //           new sessionDescription(answer),
  //           function() {
  //             socket.emit("make-answer", {
  //               answer: answer,
  //               to: data.socket
  //             });
  //           },
  //           error
  //         );
  //       }, error);
  //     },
  //     error
  //   );
  // });

  socket.on("answer-made", function(data) {
    console.log("answer-made", data);
    pc.setRemoteDescription(
      new sessionDescription(data.answer),
      function() {
        //   document.getElementById(data.socket).setAttribute("class", "active");
        // if (!answersFrom[data.socket]) {
        //   createOffer(data.socket);
        //   answersFrom[data.socket] = true;
        // }
        icons.setAttribute("class", "active");
        hangup.setAttribute("class", "active");
      },
      error
    );
  });

  function createOffer(id) {
    //
    makeACall.setAttribute("class", "hidden"); //
    pc.createOffer(function(offer) {
      console.log("offer", offer);
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
};
