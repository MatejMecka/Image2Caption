import {
    AutoProcessor,
    Moondream1ForConditionalGeneration,
    AutoTokenizer
} from "@huggingface/transformers"

import {hasFp16} from '../utils.js';

export class Moondream {
    static model_id = 'Xenova/moondream2';
    static tokenizer = null;
    static processor = null;
    static model = null;
    static supportsFp16 = null;

    static async getInstance(progress_callback = null) {

        this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
            progress_callback,
        });

        this.processor ??= AutoProcessor.from_pretrained(this.model_id);

        // Choose the model based on whether fp16 is available
        this.supportsFp16 ??= await hasFp16();
        this.model ??= Moondream1ForConditionalGeneration.from_pretrained(this.model_id, {
            dtype: {
                embed_tokens: this.supportsFp16 ? 'fp16' : 'fp32', // or 'fp32'
                vision_encoder: this.supportsFp16 ? 'fp16' : 'fp32', // or 'q8'
                decoder_model_merged: 'q4', // or 'q4f16' or 'q8'
            },
            device: 'webgpu',
            progress_callback,
        });

        return Promise.all([this.tokenizer, this.processor, this.model]);
    }

    static resetInstance() {
        this.processor = null;
        this.model = null;
      }
}