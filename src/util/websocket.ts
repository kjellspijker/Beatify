import * as http from "http";
import * as WebSocket from "ws";
import logger from "./logger";
import { Express } from "express-serve-static-core";
import Queue from "../models/Queue.model";
import Party from "../models/Party.model";

interface ExtWebSocket extends WebSocket {
    isAlive: boolean;
}

export function main(app: Express) {
    logger.info("Initializing WebSocket");

    const server = http.createServer(app);

    const wss = new WebSocket.Server({ server });

    wss.on("connection", (ws: WebSocket) => {

        const extWs = ws as ExtWebSocket;
        extWs.isAlive = true;

        ws.on("pong", () => {
            extWs.isAlive = true;
        });

        ws.on("message", (data: string) => {
            try {
                const msg = JSON.parse(data);
                if (msg.method == "addUriToQueue") {
                    Party.findOne({
                        where: {
                            UUID: parseInt(msg.params.partyId, 16)
                        },
                        attributes: ["partyId"]
                    }).done((party) => {
                        Queue.findOrCreate({
                            where: {
                                partyId: party.partyId,
                                songUri: msg.params.uri
                            },
                            defaults: {
                                partyId: party.partyId,
                                songUri: msg.params.uri,
                                votes: 1
                            }
                        }).spread((queue: Queue, created) => {
                            if (!created) {
                                console.log(queue.votes);
                                queue.increment("votes", { by: 1 }).then((q) => {
                                    return q.reload();
                                }).then((q) => {
                                    updateClientQueueForSong(wss, ws, msg, queue);
                                });
                                console.log(queue.votes);
                            } else {
                                updateClientQueueForSong(wss, ws, msg, queue);
                            }
                        }).catch(err => {
                            console.error(err);
                        });
                    });
                } else if (msg.method == "loadQueue") {
                    Party.findOne({
                        where: {
                            UUID: parseInt(msg.params.partyId, 16)
                        },
                        attributes: ["partyId"]
                    }).done((party) => {
                        Queue.findAll({
                            where: {
                                partyId: party.partyId
                            },
                            attributes: ["songUri", "votes"]
                        }).done((queueItems) => {
                            const queue = new Array;
                            queueItems.forEach(item => {
                                queue.push({uri: item.songUri, votes: item.votes});
                            });
                            ws.send(JSON.stringify({jsonrpc: 2.0, method: "loadQueue", params: {queue: queue}}));
                        });
                    });
                }
            } catch (e) {
                console.error(e);
            }
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

function updateClientQueueForSong(wss: WebSocket.Server, ws: WebSocket, msg: any, queue: Queue) {
    wss.clients.forEach((sock: WebSocket) => {
        const extSock = sock as ExtWebSocket;
        if (!extSock.isAlive)
            return ws.terminate();
        const toSend = JSON.stringify({ jsonrpc: 2.0, method: "addSongToQueue", params: { uri: msg.params.uri, votes: queue.votes } });
        console.log("Sending: " + toSend);
        sock.send(toSend);
    });
}
