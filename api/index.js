require("dotenv").config();
const express = require("express");
const multer = require("multer");
const app = express();
const upload = multer();
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
/** Define constants and configure TL API endpoints */
const APP_API_KEY = process.env.APP_API_KEY;
const API_BASE_URL = process.env.APP_API_URL;
const PORT_NUMBER= 4000

ffmpeg.setFfmpegPath(ffmpegPath.path);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://vercel.com/shrutikas-projects-aecc15b0/pikachu',
  'https://pikachu-six.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(cors(corsOptions));

// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

/** Set up middleware for Express */
// app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

/** Define error handling middleware */
const errorLogger = (error, request, response, next) => {
  console.error(error);
  next(error);
};

const errorHandler = (error, request, response, next) => {
  return response
    .status(error.status || 500)
    .json(error || "Something Went Wrong...");
};

app.use(errorLogger, errorHandler);

process.on("uncaughtException", function (exception) {
  console.log(exception);
});

app.listen(PORT_NUMBER, () => {
  console.log(`Server Running. Listening${PORT_NUMBER}`);
});

const HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": APP_API_KEY,
};

app.get("/" , async (request, response, next) =>  {
    response.json("Pikachu is running")
})
/** Get videos */
app.get("/indexes/:indexId/videos", async (request, response, next) => {
  const params = {
    page_limit: request.query.page_limit,
  };

  try {
    const options = {
      method: "GET",
      url: `${API_BASE_URL}/indexes/${request.params.indexId}/videos`,
      headers: { ...HEADERS },
      data: { params },
    };
    const apiResponse = await axios.request(options);
    response.json(apiResponse.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || "Error Getting Videos";
    return next({ status, message });
  }
});

/** Get a video of an index */
app.get(
  "/indexes/:indexId/videos/:videoId",
  async (request, response, next) => {
    const indexId = request.params.indexId;
    const videoId = request.params.videoId;

    try {
      const options = {
        method: "GET",
        url: `${API_BASE_URL}/indexes/${indexId}/videos/${videoId}`,
        headers: { ...HEADERS },
      };
      const apiResponse = await axios.request(options);
      response.json(apiResponse.data);
    } catch (error) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || "Error Getting a Video";
      return next({ status, message });
    }
  }
);

/** Generate open-ended text of a video */
app.post("/videos/:videoId/generate", async (request, response, next) => {
  const videoId = request.params.videoId;
  let prompt = request.body.data;
  try {
    const options = {
      method: "POST",
      url: `${API_BASE_URL}/generate`,
      headers: { ...HEADERS, accept: "application/json" },
      data: { ...prompt, video_id: videoId, temperature: 0.3 },
    };
    const apiResponse = await axios.request(options);
    response.json(apiResponse.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || "Error Generating Text";
    return next({ status, message });
  }
});

/** Index a video and return a task ID */
app.post(
  "/index",
  upload.single("video_file"),
  async (request, response, next) => {
    const formData = new FormData();

    // Append data from request.body
    Object.entries(request.body).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const blob = new Blob([request.file.buffer], {
      type: request.file.mimetype,
    });

    formData.append("video_file", blob, request.file.originalname);

    const options = {
      method: "POST",
      url: `${API_BASE_URL}/tasks`,
      headers: {
        "x-api-key": APP_API_KEY,
        accept: "application/json",
        "Content-Type":
          "multipart/form-data; boundary=---011000010111000001101001",
      },
      data: formData,
    };
    try {
      const apiResponse = await axios.request(options);
      response.json(apiResponse.data);
    } catch (error) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || "Error indexing a Video";
      return next({ status, message });
    }
  }
);

/** Check the status of a specific indexing task */
app.get("/tasks/:taskId", async (request, response, next) => {
  const taskId = request.params.taskId;

  try {
    const options = {
      method: "GET",
      url: `${API_BASE_URL}/tasks/${taskId}`,
      headers: { ...HEADERS },
    };
    const apiResponse = await axios.request(options);
    response.json(apiResponse.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || "Error getting a task";
    return next({ status, message });
  }
});


/** Generate gist for Hashtags and title of a video */
app.post("/videos/:videoId/gist", async (request, response, next) => {
 
  const videoId = request.params.videoId;
  let types = request.body.data;
  try {
    const options = {
      method: "POST",
      url: `${API_BASE_URL}/gist`,
      headers: { ...HEADERS, accept: "application/json" },
      data: { ...types, video_id: videoId },
    };
    const apiResponse = await axios.request(options);
    response.json(apiResponse.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.message || "Error Generating Gist of a Video";
    return next({ status, message });
  }
});

/** Summarize a video */
app.post("/videos/:videoId/summarize", async (request, response, next) => {
  const videoId = request.params.videoId;
  let type = request.body.data;

  try {
    const options = {
      method: "POST",
      url: `${API_BASE_URL}/summarize`,
      headers: { ...HEADERS, accept: "application/json" },
      data: { ...type, video_id: videoId },
    };
    const apiResponse = await axios.request(options);
    response.json(apiResponse.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.message || "Error Summarizing a Video";
    return next({ status, message });
  }
});

const semanticSearchVideos = async (query, indexId, apiKey) => {

  const url = process.env.APP_API_URL;
  console.log('apiresponse14', query, indexId, apiKey, url);
  const payload = {
    search_options: ["visual", "conversation", "text_in_video", "logo"],
    adjust_confidence_level: 0.5,
    group_by: "clip",
    threshold: "high",
    sort_option: "score",
    operator: "or",
    conversation_option: "semantic",
    page_limit: 10,
    query: query,
    index_id: indexId
  };

  const headers = {
    accept: "application/json",
    "x-api-key": apiKey,
    "Content-Type": "application/json"
  };

  try {
    const response = await axios.post(`${url}/search`, payload, { headers });
    console.log('apiresponse15', JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with a status other than 200 range
      console.error('Error response:', error.response.data);
      console.error('Error status:', error.response.status);
      console.error('Error headers:', error.response.headers);
    } else if (error.request) {
      // Request was made but no response was received
      console.error('Error request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    console.error('Error config:', error.config);
  }
};
app.post("/video/search", async (req, res, next) => {
  try {
    const { queryText } = req.body;
    console.log('apiresponse11', JSON.stringify(queryText))
   // TODO: REMOVE THESE API KEY AND USE FROM APP CONFIG OR GET DIRECTLY IN BACKEND
    const apiKey =  process.env.APP_API_KEY; // Replace with your actual API key
    const indexId = process.env.REACT_APP_INDEX_ID; // Replace with your actual index ID
    console.log('apiresponse12', apiKey, indexId)
    const apiResponse = await semanticSearchVideos(queryText, indexId, apiKey);
    console.log('apiresponse13', JSON.stringify(apiResponse))
    res.json(apiResponse.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || "Error Searching a Video";
    return next({ status, message });
  }
});





// Function to create a single clip
const createClip = (inputFile, start, end, outputFile) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .setStartTime(start)
      .setDuration(end - start)
      .output(outputFile)
      .on('end', () => resolve(outputFile))
      .on('error', (err) => reject(err))
      .run();
  });
};

const combineClips = async (videoFilePath, outputFilePath, timestamps) => {
  try {
    const clipsDir = '/tmp/clips';
    if (!fs.existsSync(clipsDir)) {
      fs.mkdirSync(clipsDir);
    }

    const clipFiles = await Promise.all(
      timestamps.map((ts, index) => {
        const clipPath = path.join(clipsDir, `clip-${index + 1}.mp4`);
        return createClip(videoFilePath, ts.start, ts.end, clipPath);
      })
    );

    const mergedVideo = ffmpeg();

    clipFiles.forEach((clip) => {
      mergedVideo.addInput(clip);
    });

    return new Promise((resolve, reject) => {
      mergedVideo
        .on('end', () => {
          console.log('All clips have been merged successfully');
          // Clean up temporary clip files
          clipFiles.forEach((file) => fs.unlinkSync(file));
          resolve(outputFilePath); // Resolve with the output file path
        })
        .on('error', (err) => {
          console.error('Error merging clips:', err);
          reject(err);
        })
        .mergeToFile(outputFilePath, clipsDir);
    });

  } catch (error) {
    console.error('Error processing video:', error);
    throw error;
  }
};

app.post('/videos/:videoId/processvideo', async (req, res) => {
 
  const videoId =  req?.params?.videoId;
  const timestamps = req?.body?.timestamps;
  console.log(JSON.stringify(videoId),'videoid')

  for (let key in videoId) {
    if (videoId.hasOwnProperty(key)) {
        console.log(key + ': here' + videoId[key]);
    }
}

  console.log('alltimestamp', timestamps)

  const videoFilePath = path.join(__dirname, 'tmp', 'uploaded', `${videoId}.mp4`); // Adjusted video file path
  const outputFilePath = path.join(__dirname, 'tmp', 'output', `output-video-${videoId}.mp4`); // Adjusted output file path

  console.log('finale outputfile', outputFilePath)
  try {
    const outputFile = await combineClips(videoFilePath, outputFilePath, timestamps);
    res.json({ message: 'Video processing completed', outputFile });
  } catch (error) {
    res.status(500).json({ error: 'Error processing video' });
  }
});


// combineClips();
