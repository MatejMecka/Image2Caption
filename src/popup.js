import { verifyWebGPU } from './captioner.js';

const browser = window.browser || window.chrome

const supportedElem = document.querySelector('.isSupported')
if(verifyWebGPU){
    supportedElem.innerText = "WebGPU is supported"
} else {
    supportedElem.innerText = "WebGPU is not supported"
}

const selectionPicker = document.querySelector("#model-picker")
selectionPicker.addEventListener('change', function (e) {
  console.log("Changed Model!")
  console.log(e)
  document.querySelector("#selected-model").innerText = e.target.value
  browser.storage.local.set({"vlmModel": e.target.value});
})

const statusLLM = document.querySelector('.status')
browser.storage.local.get("status").then((result) => {
    console.log(result.status); // Should output: loading...
    statusLLM.innerText = result.status
  }, (error) => {
    console.error("Error getting status:", error);
});
