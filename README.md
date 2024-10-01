# StreamLingo - Video Conferencing App

StreamLingo Video Conferencing with S2ST Feature.

**StreamLingo** is a Web Based Video Conferencing App. A Real-Time S2S Translation Feature integrated in the web environment itself with **Voice Cloning**, taking your voice to apply to the translated speech with natural sounding, emotion added to it.

## Pre-requisites
- Docker Desktop.
- Install Requirements to Run Python Server.
- ngrok API Key

## Installation
### - Docker ( Node Server ) 

- Open this file file Directory (StreamLingo) in you desired IDE. And Run the Docker Desktop in Background.
- Navigate [**cd**] to the Docker-Server-Node folder. And Run the Following Commands :
```bash
cd Docker-Server-Node
```
- Run the following Command to Run Docker.
```bash
docker build -t <image_name> .
```
**Make Sure you reaplce **<image_name>** with desied name and the **.** indicates the current Directory.*
```bash
docker run -d <image_name>
```
**The **<image_name>** should be same here that was given when building. **-d** here runs the image in background.*

### - Python


- Now navigate **cd** to the python folder and run command :
```bash
python server.py
```

## In-the-Website
- Open the html file or you can use this live Website for testing  [*StreamLingo - Video Conferencing*](https://web-rtc-demo-six.vercel.app/).
- Now Create a Room using the room number and Join with the same room number for remote client.
- Once both are connected, Using the StreamLingo button you can enable and disable the transcription Services.

## Mdels Used
- [**Faster-whisper**](https://github.com/SYSTRAN/faster-whisper.git) - ASR/S2T Model.
- [**Mbart-large-50**](https://huggingface.co/facebook/mbart-large-50) - T2TT Model.
- gTTS - T2S Model.
