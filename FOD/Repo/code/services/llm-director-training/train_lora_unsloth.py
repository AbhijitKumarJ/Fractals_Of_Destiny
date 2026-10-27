import os
from datasets import load_dataset
from trl import SFTConfig, SFTTrainer
from transformers import AutoModelForCausalLM, AutoTokenizer

BASE_MODEL_ID = os.environ.get("CHRONOS_BASE_MODEL", "Qwen/Qwen2.5-7B-Instruct")
DATASET_PATH = os.environ.get("CHRONOS_DATASET", "synthetic_chronos3d_train.jsonl")
OUTPUT_DIR = os.environ.get("CHRONOS_OUTPUT_DIR", "./chronos-director-8b-lora")


def format_chat_example(example: dict, system_prompt: str) -> dict:
    text = (
        f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
        f"<|im_start|>user\n{example['instruction']}<|im_end|>\n"
        f"<|im_start|>assistant\n{example['output']}<|im_end|>"
    )
    return {"text": text}


def run_training() -> None:
    with open("system_prompt.md", "r", encoding="utf-8") as f:
        system_prompt = f.read().strip()

    raw_ds = load_dataset("json", data_files=DATASET_PATH, split="train")
    train_ds = raw_ds.map(lambda ex: format_chat_example(ex, system_prompt))

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_ID)
    model = AutoModelForCausalLM.from_pretrained(BASE_MODEL_ID, device_map="auto")

    sft_config = SFTConfig(
        output_dir=OUTPUT_DIR,
        dataset_text_field="text",
        max_seq_length=4096,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        num_train_epochs=3,
        learning_rate=2e-4,
        logging_steps=10,
        save_strategy="epoch",
    )

    trainer = SFTTrainer(
        model=model,
        train_dataset=train_ds,
        tokenizer=tokenizer,
        args=sft_config,
    )
    trainer.train()
    trainer.save_model(OUTPUT_DIR)
    print(f"Saved Chronos-Director-8B adapter to {OUTPUT_DIR}")


if __name__ == "__main__":
    run_training()
