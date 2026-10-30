"""Elevator audio for the calm alter ego (serene/): bossa-nova muzak loop (MusicGen) and the PA line (Kokoro TTS).
Run once; writes serene/audio/muzak.mp3 and serene/audio/floor.mp3. One request at a time, with backoff."""
import os, subprocess, tempfile, time, urllib.request
import replicate

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'serene', 'audio')
os.makedirs(OUT, exist_ok=True)
MUSIC = 'meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb'
TTS = 'jaaari/kokoro-82m:f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13'


def run(model, inp):
    for attempt in range(6):
        try:
            out = replicate.run(model, input=inp)
            return urllib.request.urlopen(str(out[0] if isinstance(out, list) else out)).read()
        except Exception as e:
            print('retry', attempt, str(e)[:120], flush=True)
            time.sleep(15 * (attempt + 1))
    raise SystemExit(f'{model} failed')


def mp3(raw, dest, *filters):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        f.write(raw)
    args = ['ffmpeg', '-y', '-loglevel', 'error', '-i', f.name]
    if filters:
        args += ['-af', ','.join(filters)]
    subprocess.run(args + ['-ac', '1', '-b:a', '64k', dest], check=True)
    os.unlink(f.name)
    print(dest, os.path.getsize(dest), flush=True)


if __name__ == '__main__':
    dest = os.path.join(OUT, 'muzak.mp3')
    if not os.path.exists(dest):
        raw = run(MUSIC, {'prompt': 'soft bossa nova elevator muzak, mellow electric piano, brushed drums, upright bass, lounge, clean, instrumental, calm department store',
                          'duration': 15, 'model_version': 'stereo-melody-large', 'output_format': 'wav', 'normalization_strategy': 'loudness'})
        # soft edges so it loops and fades without a click
        mp3(raw, dest, 'afade=t=in:d=0.4', 'afade=t=out:st=14.2:d=0.8')
    dest = os.path.join(OUT, 'floor.mp3')
    if not os.path.exists(dest):
        raw = run(TTS, {'text': 'Next floor: streetwear.', 'voice': 'af_bella', 'speed': 0.95})
        mp3(raw, dest, 'silenceremove=start_periods=1:start_threshold=-45dB')
