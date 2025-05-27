import {
    Florence2ForConditionalGeneration,
    AutoProcessor,
    AutoTokenizer,
} from '@huggingface/transformers';

import {hasFp16} from '../utils.js';

export class Florence {
    static model_id = 'onnx-community/Florence-2-base-ft';

    static async getInstance(progress_callback = null) {
        this.processor ??= AutoProcessor.from_pretrained(this.model_id);
        this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id);

        this.supports_fp16 ??= await hasFp16();
        this.model ??= Florence2ForConditionalGeneration.from_pretrained(this.model_id, {
            dtype: {
                embed_tokens: this.supports_fp16 ? 'fp16' : 'fp32',
                vision_encoder: this.supports_fp16 ? 'fp16' : 'fp32',
                encoder_model: 'q4', // or 'fp16' or 'fp32'
                decoder_model_merged: 'q4', // or 'fp16' or 'fp32'
            },
            device: 'webgpu',
            progress_callback,
        });

        return Promise.all([this.model, this.tokenizer, this.processor]);
    }

    static resetInstance() {
        this.processor = null;
        this.model = null;
    }
}