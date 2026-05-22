const User = require('../models/User');
const jwt = require('jsonwebtoken');


const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};


const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, ...rest } = req.body;

 
    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, phone, password and role',
      });
    }

    
    if (!['admin', 'driver', 'guest'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be admin, driver, or guest',
      });
    }

  
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered',
      });
    }

   
    const user = await User.create({ name, email, phone, password, role, ...rest });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        _id:   user._id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
        role:  user.role,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }


    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }


    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated' });
    }

    
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role);

  
    const responseData = {
      _id:   user._id,
      name:  user.name,
      email: user.email,
      phone: user.phone,
      role:  user.role,
      token,
    };

    if (user.role === 'driver') {
      responseData.status        = user.status;
      responseData.vehicleNumber = user.vehicleNumber;
      responseData.vehicleType   = user.vehicleType;
    }

    if (user.role === 'guest') {
      responseData.category = user.category;
      responseData.company  = user.company;
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: responseData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -adminNotes');
   

    if (req.user.role === 'admin') {
      const fullUser = await User.findById(req.user._id).select('-password');
      return res.json({ success: true, data: fullUser });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, getMe };
