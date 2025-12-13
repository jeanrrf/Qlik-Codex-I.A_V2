from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("NVIDIA_API_KEY")
model = os.getenv("NVIDIA_MODEL_NAME", "qwen/qwen3-coder-480b-a35b-instruct")

print(f"Testing with Key: {api_key[:10]}...")
print(f"Testing with Model: {model}")

client = OpenAI(
  base_url="https://integrate.api.nvidia.com/v1",
  api_key=api_key
)

try:
    completion = client.chat.completions.create(
      model=model,
      messages=[{"role":"user","content":"Hello"}],
      temperature=0.5,
      max_tokens=100,
      stream=False
    )

    print("Response:", completion.choices[0].message.content)
    print("✅ Success!")
except Exception as e:
    print("❌ Error:", e)
