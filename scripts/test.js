const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", () => { console.log("JSDOM ERROR"); });
virtualConsole.on("jsdomError", (error) => { console.log("JSDOM ERROR: ", error.message, error.stack); });

JSDOM.fromURL("http://localhost:4200/", { 
    runScripts: "dangerously", 
    resources: "usable",
    virtualConsole
}).then(dom => {
    setTimeout(() => {
        console.log("HTML:", dom.window.document.body.innerHTML);
    }, 3000);
});
