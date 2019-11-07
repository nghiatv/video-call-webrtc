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
    // console.log("on connect again", socket.id);
    socket.emit("get-available-pc");
  });

  socket.on("list-pc", data => {
    console.log("uuu", data);
    if (data.socket) {
      pc.setRemoteDescription(
        new sessionDescription(data.offer),
        function() {
          pc.createAnswer(function(answer) {
            pc.setLocalDescription(
              new sessionDescription(answer),
              function() {
                socket.emit("make-answer", {
                  answer: answer,
                  to: data.socket
                });
              },
              error
            );
          }, error);
        },
        error
      );
    }
  });

  socket.on("remove-user", function(id) {
    var oldRemoteVideo = document.getElementById("remote-video");
    if (oldRemoteVideo) oldRemoteVideo.remove();
  });

  socket.on("offer-made", function(data) {
    offer = data.offer;
    console.log("offer-made", data);

    pc.setRemoteDescription(
      new sessionDescription(data.offer),
      function() {
        pc.createAnswer(function(answer) {
          pc.setLocalDescription(
            new sessionDescription(answer),
            function() {
              socket.emit("make-answer", {
                answer: answer,
                to: data.socket // socketId cua make Offer
              });
            },
            error
          );
        }, error);
      },
      error
    );
  });

  // socket.on("answer-made", function(data) {
  //   console.log("answer-made", data);
  //   pc.setRemoteDescription(
  //     new sessionDescription(data.answer),
  //     function() {
  //       //
  //       console.log("tao thanh congs", data)
  //     },
  //     error
  //   );
  // });

  function error(err) {
    console.warn("Error", err);
  }
};
