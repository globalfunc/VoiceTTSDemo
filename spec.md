### Voice Cloning and TTS app

Tech stack: Laravel 12 + inertiajs + react + typescript


The app will offer the ability to select a TTS library like (Zonos, CoquiAi etc) and use its TTS models to:
1. Generate speech from text input for the selected library and model
2. Generate a voice clone by uploading one or multiple (up to 5 .wav samples)  for the selected voice cloning model.


Pages:
    - Coqui (pages/coqui/dashboard.tsx)
        Sub pages
        - Generate TTS (pages/coqui/tts.tsx)
        - Voice Clone (pages/coqui/generate-vc.tsx)
    - Zonos [skip for now]
        Sub pages [skip for now]
        - Generate TTS (pages/zonos/generate-tts.tsx) [skip for now]
        - Voice Clone (pages/zonos/generate-vc.tsx) [skip for now]
    - KittenML [skip for now]
    ....


***Important***: 
We will focus only on the first TTS library implementation (coqui-ai -> https://github.com/coqui-ai/TTS)

The app should be extensible and should be able to handle more models from different TTS providers like Zonos, KittenML etc.
This is app is just the client facing part of the implementation. The actual TTS model work will be delegated to isolated RunPod GPU servers, each server will be deployed using a docker image and will be on a pay per compute pricing. The pods wont be dedicated (running all the time) but will be coldstarted once there is a request from the users in this app.

### Overview and general purpose: 
The purpose of the app is to offer users different TTS models with options to choose model, language and generate TTS or use Voice CLoning (when/if supported) by the chosen TTS model/library. After completion the user is presented with the generated wav file and can play it in the browser or download it.
The generated output files from voice cloning and TTS requests will be peristed in a Library for later reference.
 


### UI/UX
All UI/UX will be using the inertia pages with react components.

1. Add pages/coqui/tts.tsx (routes: web.php, guard: web)
Render a form with the following fields :
    - Choose Language - use config('coqui.supported_languages') to populate
    - Chose TTS model - use config('coqui.{lang_key}.tts') to populate
    - Textarea (limit to 1000 characters with countdown character and validation error + disable typing, except backspace when characters exceed 1000)
    - Submit form button: `Generate speech`

    Generate speech (form submittion endpoint) will create a TTSProcess and a queued job that will hit an endpoint on a GPU powered RunPod instance to execute the request. 
    The pod will return response in  the following json format 
    {
        status: number, //200, 404, 422, 401 etc
        message: string, 
        url: string(url of the generated tts file, after upload to s3)
        timestamp: number (unix timestamp in seconds)
    }

    Example: TTSProcess::create([
        'staus' => ProcessStatus::PENDING,
        'json_response' => $runPodResponse,
        'text_to_speech' => $request->input('textarea')
        ....
    ])
    The TTSProcess will have fields to persist the following:
    'status', 'text_to_speech', 'json_response', created_at', 'completed_at',

    When the queued job has finished (the pod returned a response -> update the TTSProcess status -> ProcessStatus::COMPLETED)

    If queued job timedout before Runpod's response was returned, update TTSProcess status -> ProcessStatus::TIMEOUT

    If queued job has returned with an error (status != 200) -> update the TTSProcess status -> ProcessStatus::FAILED, add rsponse to payload

    If the runPod response is successfull and contains 'url' of the generated .wav file -> create a StoredFile and associate it with the TTSProcess


2. Add pages/coqui/voice-clone.tsx 
Render form with the following fields:
    - Choose language (filter only the ones with voice clone support) 
    - Choose voice cloning model (please populate a list of models with `supports_cloning=True`, put it in config/coqui.php in 'voice_clone_models' array)
    - Multiple file upload (accept up to 5 .wav files, validates each file is:  <30 second in length, <20 mb in size, display progress bar for the upload progress, add `x` button to remove uploaded files and handle their deletion in the filesystem). The validation for size and length should come from laravel config/coqui.php settings (do not hardcode them).

    Submit form button named `Generate Voice Clone`

    Validations: Inspect each uploaded wav file and check if its longer than 30 seconds (and return with errors to remove and reupload <30 sec wav files)

    The voice cloning generation also creates queued job that hits a RunPod instance endpoint that performs voice cloning, and returns response like: 
    {
        status:number, 
        message:string, 
        url: (url of the generated s3 .wav output), 
        timestamp: number (unix timestamp in seconds)
    }
    The queued jobs sync the status of VoiceCloneProcess db model depending on the status code of the returned response (200, 400, 401, 422, 304 etc.) or timeout when no response has been returned and the job has timed out


### Backend considerations:
Models:
    - VoiceCloneProcess (model, status, tts_text, created_at, completed_at, response_payload)
    - TTSProcess (model, status, tts_text, created_at, completed_at, response_payload)
    - StoredFile (process_id, process_type, storage_disk, storage_path, created_at, deleted_at, type)

        ***Important***: The type field can be either 'source' or `output` depending whether its uploaded by the user (like in voice cloning), or it has been generated by an external service (RunPod instance) and is then considered of type `output`
        process_id and process_type should serve as morph map to resolve the specific process id (TTSProcess or VoiceCloneProcess)

    
Upload file validations and formats
    - config('coqui.upload_file.validations') -> max size (number in kb), max duration (in seconds), supported formats (array): ['.wav']
    Each file upload should be checked and optimized using library like ffmpeg to check its size, audio specs and prepare it for generation, check if it complies to the validation constraints
    perform cleanup procedures like: 
        `ffmpeg -i input.wav -ac 1 -ar 22050 -acodec pcm_s16le output.wav`



2. The TTS and Voice cloning form submissions should 
    - Use Queue processing
    - Upload file to s3 or local storage (use shared UploadService to manage uploads and to serve files for frontend)
    - Save and sync status of each user's generation request as TTSProcess or VoiceCloneProcess (depending on the endpoint)
    - Create StoredFiles for uploaded and generated .wav files
    - StoredFile model records will have storage_disk, storage_path, status, name, type and will belong to a TTSProcess or VoiceCloneProcess using morphTo relationships
    - Manage cold start of RunPod servers (use cli or rest api, see https://docs.runpod.io/overview)
        - Check if RunpodInstance is already running start it if its not (show a notice on the frontend so the user knows that we are warming up the service containsers for the selected tts library and that the initial processing may take more time due to cold starting the pod)
    
    - The frontend should be notified when the specific TTSProcess or VoiceCloneProcess status has changed and show the generated output file with play media button (React play audio component, check for existing libraries that offer features like audio waveform display), or inform the user that an error has occured and give tips how to proceed (show reason for failure).


    Services and service flow:
        - CoquiVoiceCloneService (create http api requests to coqui runpod GPU server and manage errors, manage api and advanced endpoint configuration/settings)
        - CoquiTTSService (similar to CoquiVoiceCloneService but for TTS endpoint)
        - UloadFilesService (manage validation, parse/cleanup uploaded files using ffmpeg)
        - RunPodHealthService (manage cold starts, checks health status of running pods, show ttl for a running pod)

### Frontend considerations:

    React should be able to listen for changes on the backend TSSProcess/VoiceCloneProcess status (probably through broadcast or websocket connection and display the generated files or validation/processing errors in case of queue job fail/timeout/completion) in the page/form that made the request


### General implementation (coding) guidelines

    - Strive for modularity and reusability both in the react components and Laravel services, controllers and utility classes
    - Prioritise ready to use react packages vs creating everything from scratch (if lightweight and relevant for the project's usecase and dependencies)
    - Strive for readability and extract duplicate logic or very long method bodies into separate components/classes/methods.

### RunPod Management and Provisioning (in the context of this app)
    - Investigate what RunPod endpoints to use (sync or async/queued)
    - How to setup and run Runpod workers using docker image (I have created a very basic coqui docker image in /home/stoyan/Workspace/ai-worker/)
    - How to coldstart and shutdown pods so I can save compute when the app is not used (serverless approach)
