import { useEffect, useRef, useState } from 'react'
import './App.css'

import io from "socket.io-client";

const socket = io(import.meta.env.VITE_APP_SERVER_URL);

function App() {

  const video1Ref: any = useRef(null);
  const video2Ref: any = useRef(null);

  const audio1Ref: any = useRef(null);
  const audio2Ref: any = useRef(null);

  const rtcPeerConnRef = useRef(new RTCPeerConnection());
  const textAreaRef: any = useRef(null);
  const roomIdRef = useRef("");
  const offererSDPDataRef = useRef({});
  const offererCandidatesRef = useRef([]);

  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const [room, setRoom] = useState("");


  const createOffer = () => {

    rtcPeerConnRef.current.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    }).then((sdp: any) => {
      console.log(JSON.stringify(sdp));

      // setting local descrition
      rtcPeerConnRef.current.setLocalDescription(new RTCSessionDescription(sdp));

    }).catch((err: Error) => {
      console.log("Error: ", err);
    });

  }

  const createAnswer = () => {

    rtcPeerConnRef.current.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    }).then((sdp: any) => {
      console.log(JSON.stringify(sdp));

      // setting local descrition
      rtcPeerConnRef.current.setLocalDescription(new RTCSessionDescription(sdp));

    }).catch((err: Error) => {
      console.log("Error: ", err);
    });

  }

  const setRemoteDesccription = () => {

    const sdp = JSON.parse(textAreaRef.current.value);

    console.log("remote sdp = ", sdp);

    rtcPeerConnRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

  }

  const addCandidate = () => {
    const candidate = JSON.parse(textAreaRef.current.value);

    console.log("Adding candidate : ", candidate);

    rtcPeerConnRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  }

  const createRoom = async () => {
    try {

      roomIdRef.current = new Date().getTime().toString()

      const offererSDPData = await rtcPeerConnRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      console.log("offerers local sdp set...");
      rtcPeerConnRef.current.setLocalDescription(new RTCSessionDescription(offererSDPData));

      socket.emit("createRoom", {
        roomId: roomIdRef.current,
        offererSDPData
      });

      setIsRoomCreated(true);

    } catch (err) {
      console.log("Error: ", err);
    }
  }

  const joinRoom = () => {
    try {

      socket.emit("userWantToJoinRoom", { roomId: room });

    } catch (err) {
      console.log("Err: ", err);
    }
  }

  useEffect(() => {

    navigator.mediaDevices.getUserMedia({ audio: false, video: true })
      .then((stream) => {

        video1Ref.current.srcObject = stream;
        // audio1Ref.current.srcObject = stream;

        stream.getTracks().forEach((track) => {
          rtcPeerConnRef.current.addTrack(track, stream);
        });

      })
      .catch((err) => {
        console.log("Error ocurred while acquiring media devices : ", err);
      });

    const rtcPeerConn = new RTCPeerConnection();

    rtcPeerConn.onicecandidate = (data) => {
      if (data.candidate) {
        // console.log("Candidate >>>");
        // console.log(JSON.stringify(data.candidate));
        if (roomIdRef.current)
          socket.emit("offererIceCandidates", { roomId: roomIdRef.current, candidate: data.candidate });
      }
    }

    rtcPeerConn.oniceconnectionstatechange = (data) => {
      // console.log("on ice connections state change event listener called : ", data);
    }

    rtcPeerConn.ontrack = (data) => {
      // console.log("ontrack event listener called : ", data);
      video2Ref.current.srcObject = data.streams[0];
    }

    rtcPeerConnRef.current = rtcPeerConn;

  }, []);

  // socket handlers
  useEffect(() => {

    socket.on("greeting", ({ message, socketId }) => {
      console.log("message from server : ", message);
    });

    socket.on("userWantToJoinRoomRes", async ({ offererSDPData, candidates }) => {
      try {
        offererSDPDataRef.current = offererSDPData;
        offererCandidatesRef.current = candidates;

        rtcPeerConnRef.current.setRemoteDescription(new RTCSessionDescription(offererSDPData));
        console.log("answers remote sdp set...");

        // user sdp data
        const answererSDPData = await rtcPeerConnRef.current.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        })

        rtcPeerConnRef.current.setLocalDescription(new RTCSessionDescription(answererSDPData));
        console.log("answers local answer sdp set...");


        socket.emit("answererSDPData", { answererSDPData });

      } catch (err) {
        console.log("Error ocurred in userWantToJoinRoomRes : ", err);
      }
    });

    socket.on("answererWantsToJoin", ({ answererSDPData }) => {
      try {
        rtcPeerConnRef.current.setRemoteDescription(new RTCSessionDescription(answererSDPData));
        console.log("offeres remote answer sdp set...");

      } catch (err) {
        console.log("Error ocurred in answererWantsToJoin : ", err);
      }
    });


    socket.on("addIceCandidateOnAnswererSide", () => {
      console.log("setting ice candidates over answerer side...");
      // setting candidate
      offererCandidatesRef.current.forEach((candidate) => {
        rtcPeerConnRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      });

    })


  }, []);

  return (
    <>

      <video style={{ width: "30rem", height: "30rem", border: "0.1rem solid grey" }} ref={video1Ref} autoPlay></video>
      {/* <audio ref={audio1Ref} autoPlay></audio> */}

      <video style={{ width: "30rem", height: "30rem", border: "0.1rem solid grey" }} ref={video2Ref} autoPlay></video>
      {/* <audio ref={audio2Ref} autoPlay></audio> */}

      <br />
      <br />
      <br />

      {/* <button onClick={createOffer}>Create Offer</button>
      <button onClick={createAnswer}>Create Answer</button>

      <br />
      <br />

      <textarea ref={textAreaRef}></textarea>

      <br />
      <br />
      <button onClick={setRemoteDesccription}>set remote description</button>
      <button onClick={addCandidate}>Add candidate</button> */}

      <button onClick={createRoom}>Create Room</button>

      <p>roomid: {roomIdRef.current}</p>

      {/* {
        isRoomCreated ?
          <> */}
      <input type="text" value={room} onChange={(e: any) => setRoom(e.target.value)} />
      <button onClick={joinRoom} > Join Room </button>
      {/* </>
          :
          null
      } */}


    </>
  )
}

export default App
