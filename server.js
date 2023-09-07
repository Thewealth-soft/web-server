// Import necessary tools (libraries)
const http = require('http'); // For creating a web server
const path = require('path'); // For working with file paths
const fs = require('fs'); // For reading and writing files
const fsPromises = require('fs').promises; // Modern way to work with files

// Import custom tools for logging events
const logEvents = require('./logEvent'); // A special tool for logging
const EventEmitter = require('events'); // A tool to create objects that can emit events

// Create a custom event emitter object
class Emitter extends EventEmitter { };

// Initialize the custom event emitter
const myEmitter = new Emitter();

// Listen for the 'log' event and call the logEvents function when it happens
myEmitter.on('log', (msg, fileName) => logEvents(msg, fileName));

// Define the port number for the web server (default to 3500 if not specified)
const PORT = process.env.PORT || 3500;

// Function to serve files to web visitors
const serveFile = async (filePath, contentType, response) => {
  try {
    // Read the file content
    const rawData = await fsPromises.readFile(
      filePath,
      !contentType.includes('image') ? 'utf8' : ''
    );

    // Determine the data type (JSON, text, image) based on 'contentType'
    const data = contentType === 'application/json'
      ? JSON.parse(rawData)
      : rawData;

    // Set the response headers
    response.writeHead(
      filePath.includes('404.html') ? 404 : 200,
      { 'Content-Type': contentType }
    );

    // Send the file content as a response
    response.end(
      contentType === 'application/json' ? JSON.stringify(data) : data
    );
  } catch (err) {
    // Handle errors (e.g., file not found or server error)
    console.log(err);
    myEmitter.emit('log', `${err.name}: ${err.message}`, 'errLog.txt');
    response.statusCode = 500;
    response.end();
  }
}

// Create a web server
const server = http.createServer((req, res) => {
  // Log the requested URL and HTTP method
  console.log(req.url, req.method);
  myEmitter.emit('log', `${req.url}\t${req.method}`, 'reqLog.txt');

  // Determine the file extension based on the requested URL
  const extension = path.extname(req.url);

  let contentType;

  // Set the content type based on the file extension
  switch (extension) {
    case '.css':
      contentType = 'text/css';
      break;
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.jpg':
      contentType = 'image/jpeg';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.txt':
      contentType = 'text/plain';
      break;
    default:
      contentType = 'text/html';
  }

  // Determine the file path based on the requested URL
  let filePath =
    contentType === 'text/html' && req.url === '/'
      ? path.join(__dirname, 'views', 'index.html')
      : contentType === 'text/html' && req.url.slice(-1) === '/'
        ? path.join(__dirname, 'views', req.url, 'index.html')
        : contentType === 'text/html'
          ? path.join(__dirname, 'views', req.url)
          : path.join(__dirname, req.url);

  // Make sure the file path has a '.html' extension if it's not an image or other specific type
  if (!extension && req.url.slice(-1) !== '/') filePath += '.html';

  // Check if the requested file exists
  const fileExists = fs.existsSync(filePath);

  if (fileExists) {
    // Serve the file to the visitor
    serveFile(filePath, contentType, res);
  } else {
    // Handle cases where the requested file does not exist
    switch (path.parse(filePath).base) {
      case 'old-page.html':
        // Redirect to a new page
        res.writeHead(301, { 'Location': '/new-page.html' });
        res.end();
        break;
      case 'www-page.html':
        // Redirect to the main page
        res.writeHead(301, { 'Location': '/' });
        res.end();
        break;
      default:
        // Serve a '404.html' page for other missing pages
        serveFile(path.join(__dirname, 'views', '404.html'), 'text/html', res);
    }
  }
})

// Start the server and listen on the specified port
server.listen(PORT, () => console.log(`Server Running on port ${PORT}`))
