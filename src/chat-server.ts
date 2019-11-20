import * as express from "express";
import { createServer, Server } from "http";
import * as socketIo from "socket.io"; // new
const cors = require("cors");
import { RESPONSE_CONNECT, RESPONSE_DISCONNECT, RESPONSE_UNKNOWN_ROOM } from "./constants";
require("dotenv").config();

interface IOffer {
  offer: any;
  room: string;
}
interface IAnswer {
  answer: any;
  room: string;
}

interface IIceMessage {
  room: string;
  candidate: RTCIceCandidate | null;
  isCaller: boolean;
}
export class ChatServer {
  public static readonly PORT: number = 3000;
  private app: express.Application;
  private port: string | number;
  private server: Server;
  private io: SocketIO.Server;
  private sdp: {
    offer?: any;
    answer?: any;
  }[] = [];
  private callerCandidate: RTCIceCandidateInit[] | RTCIceCandidate[] | null = null;
  private calleeCandidate: RTCIceCandidateInit[] | RTCIceCandidate[] | null = null;

  constructor() {
    this.createApp();
    this.config();
    this.createServer();
    this.sockets();
    this.listen();
  }

  private createApp(): void {
    this.app = express();
    this.app.use(express.static("public"));
    this.app.use(cors());
    this.app.options("*", cors());
  }

  private config(): void {
    this.port = process.env.PORT || ChatServer.PORT;
  }

  private listen(): void {
    this.server.listen(this.port, () => {
      console.log("Running server on port %s", this.port);
    });

    this.io.on("connection", (socket: socketIo.Socket) => {
      console.log(`${RESPONSE_CONNECT}: ${socket.id}`);
      let currentRoom;
      // socket.broadcast.emit("add-users", {
      //   users: [socket.id]
      // });

      // Create or join Room
      socket.on("room", (room: string) => {
        const myRoom = this.io.sockets.adapter.rooms[room] || { length: 0 };
        const numClients = myRoom.length;
        if (numClients === 0) {
          socket.join(room).emit("joined", room);
          currentRoom = room;
          console.log("Created room:", room);
        } else if (numClients === 1) {
          socket
            .join(room, () => {
              let rooms = Object.keys(socket.rooms);
              console.log("rooms: ", rooms);
              socket.broadcast.to(room).emit("another-joined"); // broadcast to everyone in the room
            })
            .emit("joined", room);
          currentRoom = room;
        } else {
          socket.emit("full", room);
        }
      });

      socket.on("leave", (room: string) => {
        const rooms = Object.keys(this.io.sockets.adapter.rooms);
        const hasRoom = rooms.find((roomName: string) => roomName === room);
        if (hasRoom) {
          socket.leave(room, () => {
            this.io.to(room).emit("remoteLeave", socket.id);
          });
        } else {
          socket.emit("leaveError", { error: RESPONSE_UNKNOWN_ROOM });
        }
      });

      // handle candidate
      socket.on("make-candidate", (message: IIceMessage) => {
        // if (message.isCaller) {
        //   this.calleeCandidate[currentRoom] = message.candidate;
        // } else {
        //   this.calleeCandidate[currentRoom] = message.candidate;
        // }
        socket.broadcast.to(message.room).emit("candidate", message);
      });

      socket.on("disconnect", () => {
        console.log(`${RESPONSE_DISCONNECT}`);
        socket.broadcast.to(currentRoom).emit("remoteLeave", socket.id);
        // this.io.emit("remove-user", socket.id);
      });

      socket.on("make-offer", (data: IOffer) => {
        // RN will send offer
        console.log("Make offer. Room:", data.room);
        // this.sdp[data.room].offer = data.offer;
        socket.broadcast.to(data.room).emit("offer-made", data);
      });

      socket.on("make-answer", (data: IAnswer) => {
        // Webapp always awnser this offer
        console.log("Make answer. Room: ", data.room);
        // this.sdp[data.room].answer = data.answer;
        socket.broadcast.to(data.room).emit("answer-made", data);
      });
    });
  }

  private createServer(): void {
    this.server = createServer(this.app);
  }

  private sockets(): void {
    this.io = socketIo(this.server);
  }

  public getApp(): express.Application {
    return this.app;
  }

  protected handleRoom(): void {
    // TODO
  }
}
