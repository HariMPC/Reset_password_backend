const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const mongoose = require('mongoose');
const nodemailer = require("nodemailer");
const { error } = require('console');
require('dotenv').config();

const PORT = 8000;
const app = express();
app.use(bodyParser.json());

// Data Base connection
mongoose.connect('mongodb+srv://HariSudhan:Hari123@cluster0.nll4qrq.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
console.log("db is connected")

// created a schema for user details
const userSchema = new mongoose.Schema({
  name:String,
  email: String,
  password: String,
  resetToken: String,
  resetTokenExpiry: Date,
});

const User = mongoose.model('User', userSchema);

app.get("/",async(req,res)=>{
  try {
    res.status(200).send({message:'Hai user! your welcome to continue after register or login'})
  } catch (error) {
    res.status(202).send({message:'internal server error'})
  }
})

//register the user account
app.post("/register", async (req, res) => {
  try {
      const { username, email, password } = req.body;

      const users = await User.findOne({email:email}) 
      if(users){
        res.status(200).send("User already exists.");
      }
      else{
          const user = new User({
              username,
              email,
              password
          })
          const savedUser = await user.save();
          res.status(201).json({ message: 'User registered successfully', user: savedUser });
        }
  } catch (error) {
      res.status(504).json({ message: "Internal server Error" });
  }

})

//login to your account
app.post("/login", async (req, res) => {
  try {
      const { email, password } = req.body;

      const user = await User.findOne({ email : email })

      if (!user) {
        res.status(404).json({ message: "Invalid email or password", user });
        return;
      }
      res.send({message :'login is successfully'})
  } catch (error) {
      res.status(504).json({ message: 'internal server errorde', error });
  }

})

// submiting the email to get the rest link
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if(!email){
      return res.send({message : "Email is required"})
    }

    const user = await User.findOne({ email });
  
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const tokenExpiry = Date.now() + 3600000;
  
    user.resetToken = token;
    user.resetTokenExpiry = tokenExpiry;
    await user.save();
    const link = "click this link to reset your password,`http://localhost:3000/reset-password/?token=${token}`";

   const sendmail = async  ()=> {
      try {
        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL,
            pass: process.env.GMAIL_PASSWORD,
          },
        });
    console.log(user)
        let mailOptions = {
          from: process.env.GMAIL,
          to: user.email,
          subject: "reset password",
          text: JSON.stringify(link),
        };
    
        await transporter.sendMail(mailOptions);
        return res
      .status(200)
      .send({ message: "Reset password link has been sent to your email." })

      } catch (error) {
        res
        .status(400)
        .send({ message: "Error while sending email: Internal Server Error:  ", error })
      }
    }
      sendmail();
  }
  catch (error) {
     console.log("Error: ", error);
    res.status(500).send({
      message: "Internal Server Error",
      error: error,
    });
  }
});



//Submiting the new token from the mail
app.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).send({ message: 'Invalid or expired token' });
  }

  res.send({ message: 'Token is valid' });
});

// Reseting the password in the DataBase
app.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const user = await User.findOneAndUpdate(
    {
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    },
    {
      password: newPassword,
      resetToken: null,
      resetTokenExpiry: null,
    }
  );

  if (!user) {
    return res.status(400).send({ message: 'Invalid or expired token' });
  }

  res.send({ message: 'Password updated successfully' });
});

// running the server in the port 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});