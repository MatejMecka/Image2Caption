
import {
    TextStreamer,
    InterruptableStoppingCriteria,
    load_image,
    RawImage
 } from "@huggingface/transformers";

import { SmolVLM } from "./models/SmolVLM.js";
import { Janus } from "./models/Janus.js";
import { Moondream } from "./models/Moondream.js";
import { Florence } from "./models/Florence.js";

const browser = window.browser || window.chrome

const stopping_criteria = new InterruptableStoppingCriteria();

export async function verifyWebGPU() {
    try {
        const adapter = await navigator.gpu.requestAdapter();
        if(!adapter) {
            throw new Error("No adapter found. WebGPU might not be supported.")
        }
        return true;
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

    const image_url = message["content"][0]["image"]
    console.log(image_url)

    const image = await load_image(image_url)
    console.log(image)

    // Get Model
    let [tokenizer, processor, model] = []
    let image_size;

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
                images: [image_url]
            }
        ])
    } else if(selectedModel == 'Xenova/moondream2') {
        Moondream.resetInstance();
        [tokenizer, processor, model] =  await Moondream.getInstance();
        const prompt = `<image>\n\n Question: ${message["content"][1]}\n\nAnswer:`
        inputs = tokenizer(prompt)

        const image = await RawImage.fromURL(image_url)
        image_size = image.size

        const vision_inputs = await processor(image);
        inputs = {...inputs, ...vision_inputs};
        
    } else if(selectedModel == "onnx-community/Florence-2-base-ft"){
        Florence.resetInstance();
        [model, tokenizer, processor] = await Florence.getInstance();
        
        const user_input = ""
        const prompts = processor.construct_prompts(user_input);
        const text_inputs = tokenizer(prompts);
        
        const image = await RawImage.fromURL(image_url)
        image_size = image.size

        const vision_inputs = await processor(image);
        inputs = { ...text_inputs, ...vision_inputs };
    }
    
    else {
        SmolVLM.resetInstance();

        if(selectedModel == "HuggingFaceTB/SmolVLM-500M-Instruct") {
            SmolVLM.setModelId("HuggingFaceTB/SmolVLM-500M-Instruct")
        } 
        
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

    if(selectedModel == "onnx-community/Janus-Pro-1B-ONNX") {
        const outputs = await model.generate({
            ...inputs,
            max_new_tokens: 2048,
            do_sample: false,
          });

        const new_tokens = outputs.slice(null, [inputs.input_ids.dims.at(-1), null]);
        const decoded = processor.batch_decode(new_tokens, { skip_special_tokens: true });

        return decoded
    } else if(selectedModel == "onnx-community/Florence-2-base-ft") {
        const generated_ids = await model.generate({
            ...inputs,
            max_new_tokens: 128,
            num_beams: 1,
            do_sample: false,
        });
    
        const generated_text = tokenizer.batch_decode(generated_ids, { skip_special_tokens: false })[0];
        const result = processor.post_process_generation(generated_text, "<MORE_DETAILED_CAPTION>", image_size);
        return result
    } else if (selectedModel == "Xenova/moondream2") {
        const outputs = await model.generate({
            ...inputs,
            max_new_tokens: 256,
            streamer,
            stopping_criteria,
        });
        const outputText = tokenizer.batch_decode(outputs, { skip_special_tokens: false });
        return outputText
    }
    
    else {
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
    } else if (selection == "Xenova/moondream2") {
        console.log("Selected Moondream!")
        const [tokenizer, processor, model] =  await Moondream.getInstance((x) => {
            console.log(x)
        });
    } else if(selection == "onnx-community/Florence-2-base-ft") {
        console.log("Selected Florence2!")
        const [model, tokenizer, processor] = await Florence.getInstance(x => {
            // We also add a progress callback to the pipeline so that we can
            // track model loading.
            self.postMessage(x);
        });

    } else if(selection == "HuggingFaceTB/SmolVLM-500M-Instruct") {
        console.log("Selected SmolVLM - 500 Million Parameters! ")
        SmolVLM.setModelId("HuggingFaceTB/SmolVLM-500M-Instruct")
        const [processor, model] = await SmolVLM.getInstance((x) => {
            // We also add a progress callback to the pipeline so that we can
            // track model loading.
            console.log(x)
            self.postMessage(x);
        });
    }
    else {
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

    browser.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon96.png',
        title: 'Finished downloading model!',
        message: 'Image2Caption is now ready to be used!'
      });
    
}