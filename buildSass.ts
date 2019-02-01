import { writeFile, readdirSync, unlink } from "fs";
const randToken = require("rand-token");

const sass = require("node-sass");

async function run() {
    const promise = await new Promise((resolve, reject) => {
        sass.render({
            file: "src/public/css/main.scss",
            includePaths: [
                "src/public/css",
                "src/public/css/*"
            ]
        }, (error, result) => {
            if (!error) {
                const files = readdirSync("dist/public/css");
                let id = randToken.generate(16);
                for (const i in files) {
                    const file = files[i];
                    if (file.includes("-") && file.substr(0, file.indexOf("-")) == "test") {
                        const oldId = file.substr(file.indexOf("-") + 1, file.indexOf("."));
                        while (oldId == id) {
                            id = randToken.generate(16);
                        }
                        unlink("dist/public/css/" + file, (err) => {
                            if (err) console.error(err);
                        });
                    }
                }
                writeFile("dist/public/css/test-" + id + ".css", result.css, function (err) {
                    if (err) console.error(err);
                    resolve("css/test-" + id + ".css");
                });
            } else {
                console.error(error);
            }
        });
    }).catch(err => { throw err; });
    return promise;
}

export function start() {
    return new Promise((resolve, reject) => {
        run().then(data => {
            resolve(data);
        });
    });
}

start().then(newFile => { console.log("New file is: " + newFile); });