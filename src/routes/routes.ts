import * as express from "express";
import * as path from "path";

export class Routes {
  private app: express.Application;

  constructor(app: express.Application) {
    this.app = app;
    this.setStaticDir(); // new
  }

  public getRoutes(): void {
    this.home();
  }

  private home(): void {

    this.app.get("/", (request, response) => {
      response.sendFile("index.html"); // new
    });
    // offer
  }

  // new
  private setStaticDir(): void {
    this.app.use(express.static(path.join(__dirname, "../views")));
  }
}
