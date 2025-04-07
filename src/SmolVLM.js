import {
    AutoProcessor,
    AutoModelForVision2Seq
} from "@huggingface/transformers"

export class SmolVLM {
    static model_id = "HuggingFaceTB/SmolVLM-256M-Instruct";
  
    static async getInstance(progress_callback = null) {
      this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
        progress_callback,
      });
  
      this.model ??= AutoModelForVision2Seq.from_pretrained(this.model_id, {
        dtype: "fp32",
        device: "webgpu",
        progress_callback,
      });
  
      return Promise.all([this.processor, this.model]);
    }

    static resetInstance() {
      this.processor = null;
      this.model = null;
    }
}