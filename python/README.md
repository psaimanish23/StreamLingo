# Python Server Using WebSockets

### Overview :

- Data Recieving here is **16-bit PCM format**, We add the Array buffaers received to a buffer and Convert it to a numpy array format using this line
`audio_data = np.frombuffer(buffer, dtype=np.int16).astype(np.float32) / 32768.0`.
- For every 5 seconds as described in the code the audio chunck from the buffer gets processed with the S2T, T2T and T2S models.
- This speech from the `gTTS` is sent back through the websockets in a `buffer foramat`.

### `Server listens on port 8000`

### Issues known :

- For Real-Time Processing 5-Seconds of audio is not recommended.
- Better to use already exsisting cloud-deployed models or manually deploy own model and then use for faster processing.
