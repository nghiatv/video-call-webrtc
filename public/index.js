// var socket = io.connect("http://localhost:3000");
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
  console.log("vao day", obj);
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
};

navigator.getUserMedia(
  { video: true, audio: true },
  function(stream) {
    var video = document.querySelector("#mini-video");
    video.setAttribute("class", "active");
    video.srcObject = stream;
    pc.addStream(stream);
  },
  error
);

socket.on("add-users", function(data) {
  for (var i = 0; i < data.users.length; i++) {
    id = data.users[i];
    createOffer(id);
  }
});

socket.on("remove-user", function(id) {
  //   var div = document.getElementById(id);
  //   document.getElementById("users").removeChild(div);
});

socket.on("offer-made", function(data) {
  offer = data.offer;

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
});

socket.on("answer-made", function(data) {
  pc.setRemoteDescription(
    new sessionDescription(data.answer),
    function() {
      //   document.getElementById(data.socket).setAttribute("class", "active");
      if (!answersFrom[data.socket]) {
        createOffer(data.socket);
        answersFrom[data.socket] = true;
      }
    },
    error
  );
});

function createOffer(id) {
  pc.createOffer(function(offer) {
    pc.setLocalDescription(
      new sessionDescription(offer),
      function() {
        socket.emit("make-offer", {
          offer: offer,
          to: id
        });
      },
      error
    );
  }, error);
}

function error(err) {
  console.warn("Error", err);
}
