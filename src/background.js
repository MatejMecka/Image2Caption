import { loadModel, 
    verifyWebGPU,
    generateCaption
} from './captioner.js';

import { generateMessage } from './utils.js';

const browser = window.browser || window.chrome
const DEFAULT_MODEL = "HuggingFaceTB/SmolVLM-256M-Instruct"

// Function to send progress updates to popup
function sendProgressToPopup(messageData) {
    try {
        // Try to send to popup if it's open
        const result = browser.runtime.sendMessage(messageData);
        
        // Check if result is a Promise before calling catch
        if (result && typeof result.catch === 'function') {
            result.catch(() => {
                // Popup might not be open, that's okay
                console.log('Could not send to popup (might be closed)');
            });
        }
    } catch (error) {
        // Handle synchronous errors
        console.log('Could not send to popup:', error.message);
    }
}

// Function to setup worker message handling with progress forwarding
function setupWorkerProgressHandling(worker) {
    const originalPostMessage = worker.postMessage.bind(worker);
    const originalAddEventListener = worker.addEventListener.bind(worker);
    
    // Intercept worker addEventListener to catch progress messages
    worker.addEventListener = function(type, listener, options) {
        if (type === 'message') {
            const wrappedListener = (e) => {
                // Forward progress messages to popup
                switch (e.data.status) {
                    case 'loading':
                        sendProgressToPopup({
                            type: 'loading',
                            data: e.data.data
                        });
                        break;
                    case 'initiate':
                        sendProgressToPopup({
                            type: 'initiate',
                            file: e.data.file,
                            progress: e.data.progress || 0,
                            total: e.data.total
                        });
                        break;
                    case 'progress':
                        sendProgressToPopup({
                            type: 'progress',
                            file: e.data.file,
                            progress: e.data.progress,
                            total: e.data.total
                        });
                        break;
                    case 'done':
                        sendProgressToPopup({
                            type: 'done',
                            file: e.data.file
                        });
                        break;
                    case 'ready':
                        sendProgressToPopup({
                            type: 'ready'
                        });
                        browser.storage.local.set({"status": "Model Ready"});
                        break;
                    case 'error':
                        sendProgressToPopup({
                            type: 'error',
                            data: e.data.data
                        });
                        browser.storage.local.set({"status": "Error: " + e.data.data});
                        break;
                }
                
                // Call original listener
                listener(e);
            };
            return originalAddEventListener(type, wrappedListener, options);
        }
        return originalAddEventListener(type, listener, options);
    };
    
    return worker;
}

// Modified loadModel function to handle progress
async function loadModelWithProgress(modelName) {
    try {
        sendProgressToPopup({
            type: 'loading',
            data: `Loading ${modelName}...`
        });
        
        // Assuming loadModel returns a worker or has worker access
        // You'll need to modify this based on your actual loadModel implementation
        const result = await loadModel(modelName);
        
        return result;
    } catch (error) {
        sendProgressToPopup({
            type: 'error',
            data: error.message
        });
        throw error;
    }
}

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
            const image_url = info.srcUrl

            browser.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon96.png',
                title: 'Beginning captioning image!',
                message: 'Please stand by for the LLM Magic to do the job!'
              });
  
            browser.storage.local.get("vlmModel", async function(result) {
                try { 
                    await loadModelWithProgress(result.vlmModel);
                } catch (e) {
                    browser.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon96.png',
                        title: 'Failed to Load Model',
                        message: 'The selected model failed to load on your machine :/ Check the dev logs'
                      });
                    return;
                }

                try {
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

                    browser.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon96.png',
                        title: 'Succesfully captioned!',
                        message: 'A caption has been generated for your image. Use your screen reader to read it.'
                      });

                } catch (e) {
                    browser.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon96.png',
                        title: 'Failed to Caption image',
                        message: 'There was an error performing captioning to the image. Check the dev logs'
                      });
                }

            })
            break;
        case "caption-custom-image":
            const custom_image_url = info.srcUrl;
            
            browser.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon96.png',
                title: 'Beginning custom captioning!',
                message: 'Using your custom prompt to caption the image...'
            });

            browser.storage.local.get(["vlmModel", "customPrompt"], async function(result) {
                try {
                    await loadModelWithProgress(result.vlmModel);
                } catch (e) {
                    browser.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon96.png',
                        title: 'Failed to Load Model',
                        message: 'The selected model failed to load on your machine :/ Check the dev logs'
                    });
                    return;
                }

                try {
                    // Use custom prompt if available, otherwise use default
                    const customPrompt = result.customPrompt || "Describe this image in detail.";
                    const messageData = generateMessage(custom_image_url, customPrompt)["data"];
                    
                    const model_output = await generateCaption(messageData, result.vlmModel).catch(err => {
                        console.error(err)
                    })

                    browser.tabs.sendMessage(tab.id, {
                        srcUrl: custom_image_url,
                        action: "image-complete-custom",
                        caption: model_output[0],
                        model: result.vlmModel || DEFAULT_MODEL,
                        prompt: customPrompt
                    })

                    browser.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon96.png',
                        title: 'Custom caption generated!',
                        message: 'Your custom prompt caption has been generated!'
                    });

                } catch (e) {
                    browser.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon96.png',
                        title: 'Failed to Caption image',
                        message: 'There was an error performing custom captioning. Check the dev logs'
                    });
                    console.error(e);
                }
            });
            break;
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
        loadModelWithProgress(selectedModel);
    });
    //browser.runtime.sendMessage({"message": "loading", data: undefined});
}

