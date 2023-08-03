import { useEffect, useRef, useState } from 'react'
import './App.css'

import io from "socket.io-client";

const socket = io(import.meta.env.VITE_APP_SERVER_URL);

function App() {

  // const video1Ref: any = useRef(null);
  // const video2Ref: any = useRef(null);

  const audio1Ref: any = useRef(null);
  // const audio2Ref: any = useRef(null);
  // const textAreaRef: any = useRef(null);

  const rtcPeerConnRef = useRef(new RTCPeerConnection());
  const roomIdRef = useRef("");
  const offererSDPDataRef = useRef({});
  const offererCandidatesRef = useRef([]);

  // const [isRoomCreated, setIsRoomCreated] = useState(false);
  // const [room, setRoom] = useState("");

  const [offerers, setOfferers] = useState([]);

  const [currentlyHandlingSocketId, setCurrentlyHandlingSocketId] = useState("");

  // const createOffer = () => {

  //   rtcPeerConnRef.current.createOffer({
  //     offerToReceiveAudio: true,
  //     offerToReceiveVideo: true
  //   }).then((sdp: any) => {
  //     console.log(JSON.stringify(sdp));

  //     // setting local descrition
  //     rtcPeerConnRef.current.setLocalDescription(new RTCSessionDescription(sdp));

  //   }).catch((err: Error) => {
  //     console.log("Error: ", err);
  //   });

  // }

  // const createAnswer = () => {

  //   rtcPeerConnRef.current.createAnswer({
  //     offerToReceiveAudio: true,
  //     offerToReceiveVideo: true
  //   }).then((sdp: any) => {
  //     console.log(JSON.stringify(sdp));

  //     // setting local descrition
  //     rtcPeerConnRef.current.setLocalDescription(new RTCSessionDescription(sdp));

  //   }).catch((err: Error) => {
  //     console.log("Error: ", err);
  //   });

  // }

  // const setRemoteDesccription = () => {

  //   const sdp = JSON.parse(textAreaRef.current.value);

  //   console.log("remote sdp = ", sdp);

  //   rtcPeerConnRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

  // }

  // const addCandidate = () => {
  //   const candidate = JSON.parse(textAreaRef.current.value);

  //   console.log("Adding candidate : ", candidate);

  //   rtcPeerConnRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  // }

  // const createRoom = async () => {
  //   try {

  //     roomIdRef.current = new Date().getTime().toString()

  //     const offererSDPData = await rtcPeerConnRef.current.createOffer({
  //       offerToReceiveAudio: true,
  //       offerToReceiveVideo: true
  //     });

  //     console.log("offerers local sdp set...");
  //     rtcPeerConnRef.current.setLocalDescription(new RTCSessionDescription(offererSDPData));

  //     socket.emit("createRoom", {
  //       roomId: roomIdRef.current,
  //       offererSDPData
  //     });

  //     setIsRoomCreated(true);

  //   } catch (err) {
  //     console.log("Error: ", err);
  //   }
  // }

  const joinRoom = (roomId: string, userSocketId: string) => {
    try {

      socket.emit("userWantToJoinRoom", { roomId });

      roomIdRef.current = roomId;

      setCurrentlyHandlingSocketId(userSocketId);

    } catch (err) {
      console.log("Err: ", err);
    }
  }

  const leaveRoom = (roomId: string) => {
    try {

      rtcPeerConnRef.current.close();

      if (roomId) socket.emit("leaveRoomFromAnswererSide", { roomId });

      location.reload();

    } catch (err) {
      console.log("Error while leaving room: ", err);
    }
  }

  useEffect(() => {

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {

        // video1Ref.current.srcObject = stream;

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
        console.log("Candidate >>>");
        console.log(JSON.stringify(data.candidate));
        if (roomIdRef.current)
          socket.emit("offererIceCandidates", { roomId: roomIdRef.current, candidate: data.candidate });
      }
    }

    rtcPeerConn.oniceconnectionstatechange = (data: any) => {
      console.log("on ice connections state change event listener called : ", data);

      if (data?.target?.iceConnectionState === "disconnected") {
        console.log("peer disconnected...");
        leaveRoom("");
      }

    }

    rtcPeerConn.ontrack = (data) => {
      console.log("ontrack event listener called : ", data);
      // video2Ref.current.srcObject = data.streams[0];
      audio1Ref.current.srcObject = data.streams[0];
      // audio1Ref.current.play();
    }

    rtcPeerConnRef.current = rtcPeerConn;

  }, []);

  // socket handlers
  useEffect(() => {

    socket.on("greeting", ({ message }) => {
      console.log("message from server : ", message);
      socket.emit("getAllAvailableOfferersList");
    });

    socket.on("liveOfferersList", (offerersList) => {
      console.log("received offeres list: ", offerersList);
      setOfferers(offerersList);
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
        });

        rtcPeerConnRef.current.setLocalDescription(new RTCSessionDescription(answererSDPData));
        console.log("answers local answer sdp set...");


        socket.emit("answererSDPData", { roomId: roomIdRef.current, answererSDPData });

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


    socket.on("addIceCandidateOnAnswererSide", ({ iceCandidates }) => {
      console.log("setting ice candidates over answerer side...");
      // setting candidate
      iceCandidates.forEach((candidate: any) => {
        rtcPeerConnRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      });

    })


  }, []);

  return (
    <>

      {/* <video style={{ width: "30rem", height: "30rem", border: "0.1rem solid grey" }} ref={video1Ref} autoPlay></video> */}
      <audio ref={audio1Ref} autoPlay></audio>

      {/* <video style={{ width: "30rem", height: "30rem", border: "0.1rem solid grey" }} ref={video2Ref} autoPlay></video> */}
      {/* <audio ref={audio2Ref} autoPlay></audio> */}

      {/* <button onClick={createOffer}>Create Offer</button>
      <button onClick={createAnswer}>Create Answer</button>

      <br />
      <br />

      <textarea ref={textAreaRef}></textarea>

      <br />
      <br />
      <button onClick={setRemoteDesccription}>set remote description</button>
      <button onClick={addCandidate}>Add candidate</button> */}

      {/* <button onClick={createRoom}>Create Room</button>

      {
        isRoomCreated ?
          <>
            <p>roomid: {roomIdRef.current}</p>
          </>
          :
          null
      }

      <input type="text" value={room} onChange={(e: any) => setRoom(e.target.value)} />
      <button onClick={() => joinRoom(room)} > Join Room </button> */}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2rem 2rem" }}>
        <h1 style={{ fontSize: "3rem" }}>Agent Dashboard</h1>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "2rem", color: "green" }}>Total Calls &nbsp; &nbsp; </p>
          <div style={{ backgroundColor: "green", borderRadius: "5rem", width: "3rem", height: "3rem", display: "grid", placeItems: "center" }}>
            <p style={{ textAlign: "center", fontSize: "2rem", color: "white" }}>{offerers?.length}</p>
          </div>
        </div>
      </div>

      <hr />

      <h1 style={{ padding: "1rem 2rem", color: "grey" }}> {offerers?.length === 0 ? "No Call Available." : "Available Calls..."} </h1>

      <div className='call-container'>
        {
          offerers.map((offerer: any) => {
            return (
              <>
                <div key={offerer?.userSocketId}>

                  <div style={{ marginBottom: "1rem" }}>
                    <h1>Socket Id</h1>
                    <p style={{ fontSize: "1.4rem", color: "grey" }}>{offerer?.userSocketId}</p>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <h1>Room Id</h1>
                    <p style={{ fontSize: "1.4rem", color: "grey" }}>{offerer?.roomId}</p>
                  </div>

                  {
                    currentlyHandlingSocketId !== offerer?.userSocketId ?

                      !currentlyHandlingSocketId ?
                        <button
                          className='join-cut-call-button'
                          style={{ background: "green" }}
                          onClick={() => joinRoom(offerer?.roomId, offerer?.userSocketId)}>
                          Join This Call
                        </button>
                        :
                        null

                      :

                      <button
                        className='join-cut-call-button'
                        style={{ background: "red" }}
                        onClick={() => leaveRoom(offerer?.roomId)}>
                        Cut Call
                      </button>
                  }

                </div>

              </>
            );
          })
        }
      </div>

    </>
  )
}

export default App
