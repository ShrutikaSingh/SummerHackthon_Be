require("dotenv").config();
const express = require("express");
const multer = require("multer");
const app = express();
const upload = multer();
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

/** Define constants and configure TL API endpoints */
const TWELVE_LABS_API_KEY = process.env.REACT_APP_API_KEY;
const API_BASE_URL = "https://api.twelvelabs.io/v1.2";
const PORT_NUMBER = process.env.REACT_APP_PORT_NUMBER || 4001;

/** Set up middleware for Express */
app.use(cors());
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

/** Set up Express server to listen on port 4002 */
app.listen(PORT_NUMBER, () => {
  console.log(`Server Running. Listening on port ${PORT_NUMBER}`);
});

const HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": TWELVE_LABS_API_KEY,
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
        "x-api-key": TWELVE_LABS_API_KEY,
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
  const url = "https://api.twelvelabs.io/v1.2/search";

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

  return axios.post(url, payload, { headers });
};

app.post("/video/search", async (req, res, next) => {
  try {
    const { queryText } = req.body;
   // TODO: REMOVE THESE API KEY AND USE FROM APP CONFIG OR GET DIRECTLY IN BACKEND
    const apiKey =  process.env.REACT_APP_API_KEY; // Replace with your actual API key
    const indexId = process.env.REACT_APP_INDEX_ID; // Replace with your actual index ID
    const apiResponse = await semanticSearchVideos(queryText, indexId, apiKey);
    res.json(apiResponse.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || "Error Searching a Video";
    return next({ status, message });
  }
});



const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

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
    const clipsDir = path.join(__dirname, 'clips');
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
  console.log(JSON.stringify(videoId),'videoid')

  for (let key in videoId) {
    if (videoId.hasOwnProperty(key)) {
        console.log(key + ': here' + videoId[key]);
    }
}

  let timestamps = req?.body?.timestamps;
  console.log('alltimestamp', timestamps)

  const videoFilePath = `/Users/206819985/Desktop/summer_hackathon/generate-social-posts/public/videos/uploaded/2.mp4`; // Replace with your video file path
  //const outputFilePath = `/Users/206819985/Desktop/summer_hackathon/generate-social-posts/videos/output/${videoId}.mp4`; // Replace with desired output file path
  const outputFilePath = `/Users/206819985/Desktop/summer_hackathon/generate-social-posts/public/videos/output/output.mp4`
  try {
    const outputFile = await combineClips(videoFilePath, outputFilePath, timestamps);
    res.json({ message: 'Video processing completed', outputFile });
  } catch (error) {
    res.status(500).json({ error: 'Error processing video' });
  }
});


// combineClips();
