import { loadModel, 
    verifyWebGPU,
    generateCaption
} from './captioner.js';

import { generateMessage } from './utils.js';

const browser = window.browser || window.chrome
const DEFAULT_MODEL = "HuggingFaceTB/SmolVLM-256M-Instruct"

// On Extension installation create a menu
browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
        id: "caption-image",
        title: "Generate caption",
        contexts: ["image"],
    });

    browser.contextMenus.create({
        id: "caption-custom-image",
        title: "Generate caption with custom prompt",
        contexts: ["image"],
    });

    // Add an On Click event Listener for image clicks
    browser.contextMenus.onClicked.addListener((info, tab) => {
    console.log(info)
    console.log(tab)
    switch (info.menuItemId) {
        case "caption-image":
            // Extract the URL
            //const image_url = info.selectionText.srcUrl || info.selectionText.frameUrl
            const image_url = info.srcUrl
            
            browser.storage.local.get("vlmModel", async function(result) {
                loadModel(result.vlmModel);
                const model_output = await generateCaption(generateMessage(image_url)["data"], result.vlmModel).catch(err => {
                    console.error(err)
                })
                console.log(model_output)
                console.log(result.vlmModel)

                browser.tabs.sendMessage(tab.id, {
                    srcUrl: image_url,
                    action: "image-complete",
                    caption: model_output[0],
                    model: result.vlmModel || DEFAULT_MODEL
                })

                console.log("Sent")

            })
            break;
        case "caption-custom-image":
            const prompt = prompt("Input your prompt here: ")
            browser.storage.local.get("vlmModel", async function(result) {
                loadModel(result.vlmModel);
                console.log(await generateCaption(generateMessage(image_url)["data"], result.vlmModel))
            })
    }
    });
});

browser.runtime.onMessage.addListener(
    async function messageListener(message, sender, sendResponse) {
        console.log(message)
        console.log(sender)
        if(message["message"] == "caption"){
            browser.storage.local.get("vlmModel", async function(result) {
                console.log(await generateCaption(message["data"], result.vlmModel))
            })
            
        }
    }
)

if(verifyWebGPU){
    console.log("WebGPU is supported! ")
    console.log("Loading model")
    browser.storage.local.set({"status": "Loading..."});
    browser.storage.local.get("vlmModel", function(result) {
        const selectedModel = result.vlmModel;
        // Now you can use selectedModel
        console.log("Selected Model:", selectedModel);
        loadModel(selectedModel);
    });
    //browser.runtime.sendMessage({"message": "loading", data: undefined});
}
