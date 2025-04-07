import { generateMessage } from "./utils.js";

console.log("Loaded on tab")
const browser = window.browser || window.chrome

const images = document.querySelectorAll("img")
let messages = [];
console.log(images)

/*
images.forEach(async elem => {
    // Retrieve image url
    const image_url = elem.src

    message_to_browser = generateMessage(image_url);

    messages.push(message_to_browser);
})

messages.forEach((elem) => {
    browser.runtime.sendMessage(elem);
})
    
*/

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("GOT A MESSAGE")
    console.log(message)
    console.log(sender)
    if (message.action === "image-complete") {
        const img = document.querySelector(`img[src="${message.srcUrl}"]`);
        if(message.model == "HuggingFaceTB/SmolVLM-256M-Instruct"){
            img.alt = message.caption.split("Assistant: ")[1]
        } else {
            img.alt = message.caption
        }
       
    }
})
