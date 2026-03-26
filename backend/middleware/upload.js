const multer = require("multer");

const storage = multer.diskStorage({ // tells where to put the file
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); //tells what the file name will be....
  }
});

const upload = multer({ storage });

module.exports = upload;