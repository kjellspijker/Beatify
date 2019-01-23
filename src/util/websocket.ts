import * as http from "http";
import * as WebSocket from "ws";
import logger  from "./logger";
import { Express } from "express-serve-static-core";

interface ExtWebSocket extends WebSocket {
    isAlive: boolean;
}

export function main(app: Express) {
    logger.info("Initializing WebSocket");

    const server = http.createServer(app);

    const wss = new WebSocket.Server({server});

    wss.on("connection", (ws: WebSocket) => {

        const extWs = ws as ExtWebSocket;
        extWs.isAlive = true;

       ws.send("Hey");

        ws.on("pong", () => {
            console.log("Pong");
            extWs.isAlive = true;
        });

        ws.on("message", (msg: string) => {
            console.log("Message received: " + msg.toString());
            ws.send("You sent: " + msg);
        });
    });

    setInterval(() => {
        wss.clients.forEach((ws: WebSocket) => {
            const extWs = ws as ExtWebSocket;
            if (!extWs.isAlive) return ws.terminate();

            extWs.isAlive = false;
            ws.ping(undefined, undefined);
        });
    }, 10000);

    server.listen(process.env.PORT || 3001, () => {
        logger.info(`Websocket started on ${server.address().address}:${server.address().port}`);
        console.log(`Websocket started on ${server.address().address}:${server.address().port}`);
    });

}