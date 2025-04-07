
import {
    TextStreamer,
    InterruptableStoppingCriteria,
    load_image,
 } from "@huggingface/transformers";
//} from '@xenova/transformers';

import { SmolVLM } from "./SmolVLM.js";
import { Janus } from "./Janus.js";

const browser = window.browser || window.chrome

const stopping_criteria = new InterruptableStoppingCriteria();

export async function verifyWebGPU() {
    try {
        const adapter = await navigator.gpu.requestAdapter();
        if(!adapter) {
            throw new Error("No adapter found. WebGPU might not be supported.")
        }
    } catch (e){
        self.postMessage({
            status: "error",
            data: e.toString(),
          });
    }
}

export async function generateCaption(message, selectedModel) {
    stopping_criteria.reset();
    let past_key_values_cache = null;

    console.log(message)
    console.log("LOADING IMAGE")
    console.log(message["content"][0]["image"])
    const image = await load_image(message["content"][0]["image"])
    console.log(image)

    // Get Model
    let [processor, model] = []

    // Note: We respond one image to one caption for now.
    let text;
    let inputs;

    console.log(selectedModel);

    if(selectedModel == "onnx-community/Janus-Pro-1B-ONNX") {
        Janus.resetInstance();
        [processor, model] =  await Janus.getInstance();
        
        inputs = await processor([
            {
                role: "<|User|>",
                content: `${message["content"][1]}\n <image_placeholder>`,
                images: [message["content"][0]["image"]]
            }
        ])

    } else {
        SmolVLM.resetInstance();
        [processor, model] =  await SmolVLM.getInstance();
        
        console.log("Generating Text")
        text = processor.apply_chat_template([message], {
            add_generation_prompt: true,
        });

        console.log("Generated Text")
        console.log(text)

         inputs = await processor(text, [image], {
            do_image_splitting:true
        });
    }
    
    console.log(message)
    console.log(processor)
    console.log(model)
    console.log(image)


    let startTime;
    let numTokens = 0;
    let tps;
    const token_callback_function = (tokens) => {
        startTime ??= performance.now();

        if (numTokens++ > 0) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
        }
    };

    

    console.log(inputs)

    const callback_function = (output) => {
        console.log(output)
    };

    const streamer = new TextStreamer(processor.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function,
        token_callback_function,
    });

    console.log(streamer)

    const { past_key_values, sequences } = await model.generate({
        ...inputs,
        do_sample: false,
        repetition_penalty: 1.1,
        max_new_tokens: 2048,
        streamer,
        stopping_criteria,
        return_dict_in_generate: true,
    }).catch((err) => {
        console.error(err)
        self.postMessage({
          status: "error",
          data: err.toString(),
        });
    });
    past_key_values_cache = past_key_values;

    console.log(sequences)

    model.dispose();

    return processor.batch_decode(sequences, {
        skip_special_tokens: true,
    });
}

export async function loadModel(selection){
    // Fetch Model
    if(selection == "onnx-community/Janus-Pro-1B-ONNX"){
        console.log("Selected Janus!")
        const [processor, model] = await Janus.getInstance((x) => {
            // We also add a progress callback to the pipeline so that we can
            // track model loading.
            console.log(x)
            self.postMessage(x);
        });
    } else {
        console.log("Selected SmolVLM!")
        const [processor, model] = await SmolVLM.getInstance((x) => {
            // We also add a progress callback to the pipeline so that we can
            // track model loading.
            console.log(x)
            self.postMessage(x);
        });
    }

    console.log("Finished downloading!")
    browser.storage.local.set({"status": "Loaded!"});
    
}