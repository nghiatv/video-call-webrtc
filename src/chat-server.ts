import * as express from "express";
import { createServer, Server } from "http";
import * as socketIo from "socket.io"; // new

export class ChatServer {
  public static readonly PORT: number = 3000;
  private app: express.Application;
  private port: string | number;
  private server: Server;
  private io: SocketIO.Server;
  private socketsArray: string[] = [];
  private oldOffer: {
    socket?: string;
    offer?: any;
  } = {};

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
  }

  private config(): void {
    this.port = process.env.PORT || ChatServer.PORT;
  }

  private listen(): void {
    this.server.listen(this.port, () => {
      console.log("Running server on port %s", this.port);
    });

    this.io.on("connection", socket => {
      this.socketsArray.push(socket.id);
      console.log("socket ", this.socketsArray);
      socket.broadcast.emit("add-users", {
        users: [socket.id]
      });

      socket.on("disconnect", () => {
        this.socketsArray.splice(this.socketsArray.indexOf(socket.id), 1);
        if (this.socketsArray.length < 2) {
          this.oldOffer = {};
        }
        this.io.emit("remove-user", socket.id);
      });

      socket.on("get-users", () => {
        if (this.socketsArray.length > 2) {
          // if room full
          socket.emit("room-full");
        } else {
          socket.emit("room-available", socket.id);
        }
      });

      socket.on("get-available-pc", () => {
        socket.emit("list-pc", this.oldOffer);
      });

      socket.on("make-offer", data => {
        // RN will send offer
        var offer = {
          offer: data.offer, // offer doc tao ra voi pc.createOffer
          socket: socket.id // socketId cua thang make offer
        };
        this.oldOffer = offer; // add peekConnection in queue

        var rest = this.socketsArray.find(sId => sId !== socket.id);
        socket.to(rest).emit("offer-made", offer);
      });

      socket.on("make-answer", data => {
        // Webapp always awnser this offer
        console.log("make offer socket id", data.to);
        // remove oldOffer

        this.oldOffer = {};
        var answer = {
          socket: socket.id, // socket cua webapp
          answer: data.answer // anwser cua web app
        };
        socket.to(data.to).emit("answer-made", answer);
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
}
