$('.room').click(function () {
  if (($('#uname').val() != '') && ($('#uroom').val() != '')) {
    $('#wrapper').show();
    $('#room_wrapper').hide('slow');
    userName = $('#uname').val();
    room = $('#uroom').val();








    //let userName = prompt("What's your name");
    //let room = prompt("Room name");
    $('#userName').text(userName);

    //here we connect to the socket.io server 
    var socket = io();

    let ID = "";
    var divConsultingRoom = document.getElementById('consultingRoom');
    var localVideo = document.getElementById('localVideo');
    var remoteVideo = document.getElementById('remoteVideo');
    
    //these are the global variables
    var localStream;
    var remoteStream;
    var rtcPeerConnection;
    //these are the STUN servers
    var iceServers = {
      'iceServers': [
        { 'url': 'stun:stun.services.mozilla.com' },
        { 'url': 'stun:stun.i.google.com:19302' },
      ]
    }
    var streamConstraints = { audio: true, video: true };
    var isCaller;

    if (room) {
      //send event that user has joined room to server
      socket.emit('create or join', { username: userName, roomName: room });
      divConsultingRoom.style = 'display:block';
    }

    //receive data from server.
    socket.on('send data', (data) => {
      ID = data.id; //ID will be used later
      console.log(" my ID:" + ID);
    });

    $("#usermsg").focus();
    //when form is submitted, capture the input value and then send it to server
    document.getElementsByTagName("form")[0].addEventListener("submit", function (event) {
      event.preventDefault();
      socket.emit("chat message", {
        value: document.getElementById("usermsg").value,
        user: userName,
      });
      document.getElementById("usermsg").value = "";
    });


    // Picks up the data emitted by the server and displays the message to the webpage
    socket.on("chat message", (data) => {
      console.log(data.data.user + ": " + data.id);
      displayMessage(data);
    });


    function displayMessage(data) {
      let authorClass = "";
      let divClass = ""
      //verify that the user ID and the message sent ID is similar 
      if (data.id === ID) {
        console.log("This person has sent a message")
        authorClass = "me";
        divClass = "myDiv";
      } else {
        authorClass = "you";
        divClass = "yourDiv";
      }
      const div = document.createElement("div");
      div.className = divClass;
      const li = document.createElement("li");
      const p = document.createElement("p");
      div.innerHTML =
        '<p class="' +
        authorClass +
        '">' +
        data.data.user + ', ' + moment().format("hh:mm A") +

        "</p>" +
        '<p class="message"> ' +
        data.data.value +
        "</p>";
      div.appendChild(p);
      li.appendChild(div);

      document.getElementById("messages").appendChild(li);

      window.scrollTo(0, document.body.scrollHeight); //scroll to the bottom
    }




    //when server emits created
    socket.on('created', function (room) {
      //caller gets media devices with defined constraints
      navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        isCaller = true;
      }).catch(function (err) {
        console.log('An error occured when accessing media devices', err);
      })
    });


    //when server emits joined
    socket.on('joined', function (room) {
      //callee gets user media devices
      navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        socket.emit('ready', room);
      }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
      });
    });

    //when server emits ready
    socket.on('ready', function () {
      if (isCaller) {
        //creates an RTCPeerConnection object
        rtcPeerConnection = new RTCPeerConnection(iceServers);

        //add event listners to the newly created object
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.onaddstream = onAddStream;

        //add the current local stream to the object
        rtcPeerConnection.addStream(localStream);

        //prepares an offer
        rtcPeerConnection.createOffer(setLocalAndOffer, function (e) {
          console.log(e);
        });
      }
    });


    //when servers emits offer
    socket.on('offer', function (event) {
      if (!isCaller) {
        //creates an RTCPeerConnection object
        rtcPeerConnection = new RTCPeerConnection(iceServers);

        //adds events listners to newly created
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.onaddstream = onAddStream;

        //adds the current local stream to the object
        rtcPeerConnection.addStream(localStream);

        //stores the offer as remote description
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));

        //Preparees an Answer
        rtcPeerConnection.createAnswer(setLocalAndAnswer, function (e) {
          console.log(e);
        });

      }
    });


    //when server emits answer
    socket.on('answer', function (event) {
      //stores it as remot description
      rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
    });

    //when server emits candidate
    socket.on('candidate', function (event) {
      //creates a candidate object
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
      });
      //stores candidate
      rtcPeerConnection.addIceCandidate(candidate);
    });


    //when a user receive the user's video and audio stream 
    function onAddStream(event) {
      remoteVideo.srcObject = event.stream;
      remoteStream = event.stream;
    }

    //these are the functions referenced before as listeners for the peer connection
    //send a candidate meesage to server
    function onIceCandidate(event) {
      if (event.candidate) {
        console.log('sending ice candidate');
        socket.emit('candidate', {
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
          room: room
        });
      }
    }


    //stores offer and seeds message to server
    function setLocalAndOffer(sessionDescription) {
      rtcPeerConnection.setLocalDescription(sessionDescription);
      socket.emit('offer', {
        type: 'offer',
        sdp: sessionDescription,
        room: room
      });
    }

    //stores answer and send message to server
    function setLocalAndAnswer(sessionDescription) {
      rtcPeerConnection.setLocalDescription(sessionDescription);
      socket.emit('answer', {
        type: 'answer',
        sdp: sessionDescription,
        room: room
      });
    }


    
    $('#mute').click(function(){
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      $(this).val( ($(this).val() == 'Mute') ? 'Unmute' : 'Mute' );
    });

    $('#camera').click(function(){
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      $(this).val( ($(this).val() == 'Camera Off') ? 'Camera On' : 'Camera Off' );
    });


  }
});