var peerConnection = window.RTCPeerConnection;
// var socket = io.connect("http://localhost:3000");
var PeekConnectionClient = (params, socket) => {
  this.pc = new peerConnection({
    iceServers: [
      {
        url: params.url ? params.url : "stun:stun.services.mozilla.com",
        username: params.username ? params.username : "somename",
        credential: params.credential ? params.credential : "somecredentials"
      }
    ]
  });

  this.socket.on("connect", () => {
    socket.emit("get-users");
  });

  this.socket.on("room-full", () => {
    console.log("Room is full");
  });

  this.socket.on("room-available", id => {
    makeACall.setAttribute("class", "active");
    makeACall.addEventListener("click", () => {
    //   console.log("connectionState", pc.connectionState);
      createOffer(id); // chinh la socket id cua minh
    });
  });
  this.socket.on("answer-made", data => {
    this.pc.setRemoteDescription(
      new sessionDescription(data.answer),
      () => {
        if (!answersFrom[data.socket]) {
          this.createOffer(data.socket);
          answersFrom[data.socket] = true;
        }
      },
      error
    );
  });
};

PeekConnectionClient.prototype.createOffer = id => {
  //
  this.pc.createOffer(offer => {
    this.pc.setLocalDescription(
      new sessionDescription(offer),
      () => {
        this.socket.emit("make-offer", {
          offer: offer,
          to: id
        });
      },
      error
    );
  }, error);
};

PeekConnectionClient.prototype.hangup = () => {
  this.pc.close();
  this.socket.disconnect();
};
