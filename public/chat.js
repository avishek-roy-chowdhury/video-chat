let socket = io.connect("http://localhost:4000");
var videoChatLobbyDiv = document.getElementById("video-chat-lobby");
var videoChatRoomDiv = document.getElementById("video-chat-room");
var chatControlPanel = document.getElementById("chat-control-panel");

let roomInput = document.getElementById("roomName");
let joinButton = document.getElementById("join-button");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");

let muteButton = document.getElementById("mute-button");
let cameraButton = document.getElementById("camera-button");
let leaveRoomButton = document.getElementById("leave-room-button");

let roomName = "";
let rtcPeerConnection;
let creator = false;
let muteFlag = false;
let cameraFlag = false;

let userStream;
let constraints = {
  audio: true,
  video: { width: 200, height: 200 },
};
const configuration = {
    iceServers: [
      {
        urls: "stun:stun.services.mozilla.com",
      },
      {
        urls: "stun:stun1.l.google.com:19302",
      },
    ],
  };

joinButton.addEventListener("click", function () {
    if (roomInput.value == "") {
      alert("Please enter a room name");
      return;
    }
    roomName = roomInput.value;
    socket.emit("join", roomName); 
  
});

socket.on("created", function () {
    console.log("On Created");
    creator = true;
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((mediaStream) => {
        userStream = mediaStream;
        videoChatLobbyDiv.style = "display:none";
        chatControlPanel.style = "display:flex;";
        userVideo.srcObject = mediaStream;
        userVideo.onloadedmetadata = () => {
          userVideo.play();
        };
      })
      .catch((err) => {
        console.error(`${err.name}: ${err.message}`);
      });
  });
  
  socket.on("joined", function () {
    console.log("On Joined");
    creator = false;
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((mediaStream) => {
        userStream = mediaStream;
        videoChatLobbyDiv.style = "display:none";
        chatControlPanel.style = "display:flex;";
        userVideo.srcObject = mediaStream;
        userVideo.onloadedmetadata = () => {
          userVideo.play();
        };
        socket.emit("ready", roomName);
      })
      .catch((err) => {
        console.error(`${err.name}: ${err.message}`);
      });
  });

  socket.on("ready", function () {
    if (creator) {
      rtcPeerConnection = new RTCPeerConnection(configuration);
      rtcPeerConnection.onicecandidate = onICECandidateEvent;
      rtcPeerConnection.ontrack = ontrackEvent;
      console.log(userStream.getTracks());
      rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
      rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
      rtcPeerConnection
        .createOffer()
        .then((offer) => {
          rtcPeerConnection.setLocalDescription(offer);
          socket.emit("offer", offer, roomName);
        })
        .catch((error) => {
          console.log("Error while creating offer", error);
        });
    }
  });

  socket.on("candidate", function (candidate) {
    var iceCandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(iceCandidate);
  });

  socket.on("offer", function (offer) {
    if (!creator) {
      rtcPeerConnection = new RTCPeerConnection(configuration);
      rtcPeerConnection.onicecandidate = onICECandidateEvent;
      rtcPeerConnection.ontrack = ontrackEvent;
      rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
      rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
      rtcPeerConnection.setRemoteDescription(offer);
      rtcPeerConnection
        .createAnswer()
        .then((answer) => {
          rtcPeerConnection.setLocalDescription(answer);
          socket.emit("answer", answer, roomName);
        })
        .catch((error) => {
          console.log("Error while creating answer", error);
        });
    }
  });

  socket.on("answer", function (answer) {
    console.log("I am in answer::", answer);
    rtcPeerConnection.setRemoteDescription(answer);
  
  });
  
function onICECandidateEvent(event) {
    if (event.candidate) {
      socket.emit("candidate", event.candidate, roomName);
    }
  }
  
  function ontrackEvent(event) {
    peerVideo.srcObject = event.streams[0];
    peerVideo.onloadedmetadata = () => {
        peerVideo.play();
    };
  }