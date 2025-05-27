import { generateMessage } from "./utils.js";
console.log("Loaded on tab")
const browser = window.browser || window.chrome
const images = document.querySelectorAll("img")
let messages = [];

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("GOT A MESSAGE")
    console.log(message)
    console.log(sender)
    
    // Handle both regular and custom captions
    if (message.action === "image-complete" || message.action === "image-complete-custom") {
        const img = document.querySelector(`img[src="${message.srcUrl}"]`);
        
        if (img) {
            let caption = message.caption;
            
            // Handle SmolVLM model response format
            if (message.model == "HuggingFaceTB/SmolVLM-256M-Instruct" || 
                message.model == "HuggingFaceTB/SmolVLM-500M-Instruct") {
                if (caption.includes("Assistant: ")) {
                    caption = caption.split("Assistant: ")[1];
                }
            }
            
            img.alt = caption;
            
            // Log different messages for regular vs custom captions
            if (message.action === "image-complete-custom") {
                console.log("Applied custom caption:", caption);
                if (message.prompt) {
                    console.log("Used custom prompt:", message.prompt);
                }
            } else {
                console.log("Applied regular caption:", caption);
            }
        } else {
            console.warn("Could not find image with src:", message.srcUrl);
        }
    }
})