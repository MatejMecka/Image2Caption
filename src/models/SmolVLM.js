import {
  AutoProcessor,
  AutoModelForVision2Seq
} from "@huggingface/transformers"

export class SmolVLM {
  static defaultModelId = "HuggingFaceTB/SmolVLM-256M-Instruct";
  static modelId = SmolVLM.defaultModelId;
  static processor = null;
  static model = null;

  // Method to set model ID
  static setModelId(id) {
    this.modelId = id;
    // Reset instances when model changes
    this.resetInstance();
  }

  static async getInstance(progress_callback = null) {
    this.processor ??= AutoProcessor.from_pretrained(this.modelId, {
      progress_callback,
    });
    this.model ??= AutoModelForVision2Seq.from_pretrained(this.modelId, {
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