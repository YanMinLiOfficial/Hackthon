"""Short local-only ASR invocation. Audio exists in memory, not on disk."""
import io
import json
import sys
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

audio = decode_audio(io.BytesIO(sys.stdin.buffer.read()), sampling_rate=16000)
if len(audio) > 25 * 16000:
    raise ValueError("Audio exceeds 25 seconds")
model = WhisperModel(sys.argv[1], device="cpu", compute_type="int8", local_files_only=True)
segments, _ = model.transcribe(audio, language="zh", vad_filter=True, beam_size=5,
    condition_on_previous_text=False,
    initial_prompt="无障碍社区语音输入。打开语音辅助。关闭语音辅助。朗读回答。停止朗读。轮椅、坡道、无障碍卫生间、工学院。")
text = "".join(segment.text for segment in segments
    if segment.no_speech_prob < 0.6 and segment.avg_logprob > -1.0 and segment.compression_ratio < 2.4).strip()
print(json.dumps({"text": text, "engine": "local-faster-whisper"}, ensure_ascii=False))
